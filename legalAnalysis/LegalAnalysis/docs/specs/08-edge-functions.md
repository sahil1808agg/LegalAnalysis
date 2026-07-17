# Spec 08 — Supabase Edge Functions

## Overview

ContractIQ uses four Supabase Edge Functions (Deno runtime) to handle CPU/IO-heavy operations that should not run in Next.js serverless functions: text extraction, AI key term processing, chat, and feedback submission. All functions are deployed to Supabase and called from Next.js API routes.

---

## Acceptance Criteria

- Edge functions are deployed to the same Supabase project as the database
- All functions authenticate requests using the Supabase service role key (server-to-server; not exposed to client)
- Each function returns structured JSON errors with appropriate HTTP status codes
- Functions that call OpenAI use the `OPENAI_API_KEY` environment variable — never the client-side key
- Functions handle all error scenarios without crashing; unexpected errors return 500 with a human-readable message

---

## Directory Structure

```
supabase/
└── functions/
    ├── extract-text/
    │   └── index.ts
    ├── process-contract/
    │   └── index.ts
    ├── chat/
    │   └── index.ts
    └── submit-feedback/
        └── index.ts
```

---

## Shared Setup (all functions)

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
```

**CORS headers (add to every response):**
```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

Handle preflight:
```ts
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```

---

## `extract-text/index.ts`

**Called by:** `POST /api/contracts/upload` (Next.js API route)

**Input (JSON body):**
```json
{
  "contract_id": "uuid",
  "user_id": "uuid",
  "file_base64": "base64-encoded PDF binary",
  "filename": "Acme_NDA_2026.pdf"
}
```

**Process:**

1. Decode `file_base64` to a `Uint8Array`
2. Run `pdf-parse` (imported via CDN or bundled) on the buffer
3. Extract text; segment pages by inserting `[PAGE N]` markers
4. Count words: split on whitespace, count tokens; if < 100 words → return `SCANNED_PDF` error
5. Estimate token count: `Math.ceil(text.length / 4)`; if > 15,000 → return `TOKEN_LIMIT_EXCEEDED`
6. Validate page count; if > 20 → return `TOO_MANY_PAGES`
7. **Non-blocking Storage upload:** attempt to upload PDF to `contracts/{user_id}/{contract_id}/{filename}.pdf`:
   ```ts
   const { data: storageData } = await supabase.storage
     .from('contracts')
     .upload(`${user_id}/${contract_id}/${filename}`, pdfBuffer, { contentType: 'application/pdf' })
   const file_path = storageData?.path ?? null
   ```
   If storage upload fails, set `file_path = null` and continue.
8. Update contract row:
   ```sql
   UPDATE contracts
   SET contract_text = $text,
       page_count    = $page_count,
       token_count   = $token_count,
       file_path     = $file_path,
       status        = 'processing'
   WHERE id = $contract_id AND user_id = $user_id
   ```

**Success response `200`:**
```json
{ "contract_id": "uuid", "page_count": 14, "status": "processing" }
```

**Error responses:**
```json
{ "error": "SCANNED_PDF",          "message": "This appears to be a scanned PDF. Scanned PDFs are not supported yet." }
{ "error": "TOO_MANY_PAGES",       "message": "Document exceeds 20 pages." }
{ "error": "TOKEN_LIMIT_EXCEEDED", "message": "This contract is too long for analysis. Support for longer contracts is coming soon." }
```

**Page segmentation algorithm:**
```ts
function segmentPages(rawText: string, pageCount: number): string {
  // pdf-parse provides page data via options.pagerender callback
  // Use the page-by-page rendering approach:
  let result = ''
  pages.forEach((pageText, i) => {
    result += `[PAGE ${i + 1}] ${pageText.trim()} `
  })
  return result.trim()
}
```

**pdf-parse import (Deno-compatible):**
```ts
// Use the npm: specifier for Deno 1.28+
import pdfParse from 'npm:pdf-parse@1.1.1'
```

---

## `process-contract/index.ts`

*(Full implementation covered in Spec 03 — AI Extraction. Summary here for completeness.)*

**Called by:** `POST /api/contracts/[id]/process`

**Input:**
```json
{ "contract_id": "uuid", "user_id": "uuid", "custom_terms": ["string"] }
```

**Process:** Fetch contract text → build few-shot prompt → call GPT-4o (temperature 0.1, JSON mode, max_tokens 2000) → parse response → retry on JSON failure → bulk insert `key_terms` → set `status='complete'` → return `{ terms_count, contract_id }`.

**On all retries exhausted:** Set `status='error'`; return 500.

---

## `chat/index.ts`

*(Full implementation covered in Spec 06 — Chat. Summary here for completeness.)*

**Called by:** `POST /api/contracts/[id]/chat`

**Input:**
```json
{ "contract_id": "uuid", "user_id": "uuid", "user_message": "string" }
```

**Process:** Fetch `contract_text` → get/create `chat_session` → load message history (≤ 200) → save user message → build chat prompt → call GPT-4o (temperature 0.4, max_tokens 1000, AbortSignal timeout 18 s) → save assistant message → return response.

**Timeout handling:**
```ts
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 18000)
try {
  const completion = await openai.chat.completions.create({ ..., signal: controller.signal })
  clearTimeout(timeout)
} catch (err) {
  if (err.name === 'AbortError') {
    return new Response(JSON.stringify({ error: 'Response timed out. Please try again.' }), { status: 408 })
  }
  throw err
}
```

---

## `submit-feedback/index.ts`

**Called by:** `POST /api/contracts/[id]/feedback`

**Input:**
```json
{ "contract_id": "uuid", "user_id": "uuid", "rating": "up" | "down", "comment": "string | null" }
```

**Process:**
1. Validate `rating` is `"up"` or `"down"` — else return 400
2. `INSERT INTO user_feedback (contract_id, user_id, rating, comment)` 
3. On unique constraint violation (23505 PostgreSQL error code) → return 409
4. On success → return 201 `{ feedback_id: uuid }`

```ts
const { data, error } = await supabase
  .from('user_feedback')
  .insert({ contract_id, user_id, rating, comment })
  .select('id')
  .single()

if (error?.code === '23505') {
  return new Response(
    JSON.stringify({ error: 'Feedback already submitted for this contract.' }),
    { status: 409 }
  )
}
```

---

## Deployment

**Local development:**
```bash
supabase start
supabase functions serve extract-text --env-file .env.local
supabase functions serve process-contract --env-file .env.local
supabase functions serve chat --env-file .env.local
supabase functions serve submit-feedback --env-file .env.local
```

**Production deployment:**
```bash
supabase functions deploy extract-text
supabase functions deploy process-contract
supabase functions deploy chat
supabase functions deploy submit-feedback
```

**Required secrets (set via Supabase dashboard or CLI):**
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`SUPABASE_URL` is automatically available in edge functions as a built-in env var.

---

## Calling Edge Functions from Next.js API Routes

```ts
// In any Next.js API route that needs to call an edge function:
const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`

const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify(payload),
})
```

---

## Error Handling Summary

| Error | HTTP Code | Response |
|---|---|---|
| Invalid input | 400 | `{ error: "...", message: "..." }` |
| Contract not found / wrong user | 403/404 | `{ error: "Not found" }` |
| OpenAI API error (after retries) | 500 | `{ error: "Analysis failed. Please try again in a few minutes." }` |
| OpenAI timeout | 408 | `{ error: "Response timed out. Please try again." }` |
| Supabase DB error | 500 | `{ error: "Database error. Please try again." }` |
| Duplicate feedback | 409 | `{ error: "Feedback already submitted for this contract." }` |
| Unhandled exception | 500 | `{ error: "An unexpected error occurred." }` |
