# Spec 02 — Contract Upload

## Overview

The upload page lets an authenticated user select a contract type (NDA or MSA), drag-and-drop a PDF, optionally add up to 5 custom key terms, and trigger extraction. The page walks through three stages: file selection → upload + text extraction → redirect to processing.

---

## Acceptance Criteria

- User can select NDA or MSA before uploading
- Drag-and-drop and click-to-browse both work
- File rejected immediately (before any API call) if: not PDF, > 10 MB, wrong type
- After drop, a preview shows filename, size, and page count estimate
- User can add up to 5 custom key terms; attempting a 6th shows an error
- "Process Contract" button is disabled until a valid file is selected
- Processing shows a 3-step progress indicator: "Extracting text → Analysing with AI → Compiling results"
- On success: redirect to `/results/[contractId]`
- Scanned PDF (< 100 words extracted) rejected with: "This appears to be a scanned PDF. Scanned PDFs are not supported yet."
- PDF > 20 pages rejected with: "Document exceeds 20 pages."
- Contract > 15,000 tokens rejected with: "This contract is too long for analysis."
- On OpenAI failure: "Analysis failed. Please try again." with a retry CTA (does not require re-uploading)

---

## Files to Create

```
contractiq/
├── app/
│   └── upload/
│       └── page.tsx                    ← Upload page (protected)
├── components/
│   └── upload/
│       ├── ContractTypeSelector.tsx    ← NDA / MSA dropdown
│       ├── PDFUploader.tsx             ← Drag-and-drop zone + validation
│       ├── KeyTermPreview.tsx          ← Standard term list preview
│       ├── CustomTermInput.tsx         ← "+ Add Key Term" field, max 5
│       └── ProcessButton.tsx           ← Submit + loading state
├── components/
│   └── shared/
│       └── ProcessingProgress.tsx      ← 3-step progress indicator
└── app/
    └── api/
        └── contracts/
            ├── upload/
            │   └── route.ts            ← POST /api/contracts/upload
            └── [id]/
                └── process/
                    └── route.ts        ← POST /api/contracts/[id]/process
```

---

## Upload Page — `app/upload/page.tsx`

**Route:** `/upload`  
**Type:** Client Component (`'use client'`) — manages local state for file, type, custom terms, and progress.

**State:**
```ts
const [contractType, setContractType] = useState<'NDA' | 'MSA' | null>(null)
const [file, setFile] = useState<File | null>(null)
const [customTerms, setCustomTerms] = useState<string[]>([])
const [stage, setStage] = useState<'idle' | 'uploading' | 'extracting' | 'processing' | 'done' | 'error'>('idle')
const [contractId, setContractId] = useState<string | null>(null)
const [errorMessage, setErrorMessage] = useState<string | null>(null)
```

**Submit flow:**
1. `setStage('uploading')`
2. POST file + contractType + contractName to `/api/contracts/upload`
3. On success → `setContractId(data.contractId)`, `setStage('extracting')`
4. POST `{ customTerms }` to `/api/contracts/[id]/process`
5. Poll `GET /api/contracts/[id]` every 2 s until `status === 'complete'` or `status === 'error'`
6. On complete → `router.push('/results/' + contractId)`
7. On error → `setStage('error')`, show error message with retry button

**Retry button** (on error state): re-calls step 4 (process) without re-uploading (contractId already exists).

---

## `components/upload/ContractTypeSelector.tsx`

**Props:**
```ts
interface ContractTypeSelectorProps {
  value: 'NDA' | 'MSA' | null
  onChange: (type: 'NDA' | 'MSA') => void
}
```

**Renders:** Two radio-style cards — "NDA" and "MSA".  
Selecting a type immediately updates `KeyTermPreview` with the relevant standard term list.

---

## `components/upload/PDFUploader.tsx`

**Props:**
```ts
interface PDFUploaderProps {
  onFileSelect: (file: File) => void
  disabled: boolean
}
```

**Client-side validation (before any network call):**

| Check | Error message |
|---|---|
| File extension is not `.pdf` | "Please upload a PDF file." |
| File size > 10 MB (10 × 1024 × 1024 bytes) | "File is too large. Maximum file size is 10 MB." |

Show validation errors inline below the drop zone. Valid files call `onFileSelect(file)`.

**Drag events:** `onDragOver`, `onDragLeave`, `onDrop` — toggle a visual "active" border on drag-over.  
This component uses browser events so must be `'use client'`.

---

## `components/upload/KeyTermPreview.tsx`

**Props:**
```ts
interface KeyTermPreviewProps {
  contractType: 'NDA' | 'MSA' | null
  customTerms: string[]
}
```

**Standard NDA terms (10):**
Parties, Effective Date, Confidentiality Obligations, Permitted Disclosures, Term & Duration, Governing Law, Jurisdiction, IP Ownership, Non-Solicitation, Breach & Remedy

**Standard MSA terms (12):**
Parties, Service Scope, Payment Terms, Invoice Schedule, Late Payment Penalty, Liability Cap, Indemnification, IP Ownership, Termination Clause, Governing Law, Dispute Resolution, Notice Period

Renders each term as a chip/badge. Custom terms render with a "Custom" badge in blue. If `contractType` is null, shows: "Select a contract type to preview terms."

---

## `components/upload/CustomTermInput.tsx`

**Props:**
```ts
interface CustomTermInputProps {
  terms: string[]
  onChange: (terms: string[]) => void
  maxTerms?: number   // default: 5
}
```

**Behaviour:**
- Text input + "Add" button
- Pressing Enter or clicking "Add" appends the trimmed value
- Empty strings are rejected silently
- Duplicate terms are rejected silently
- If `terms.length >= maxTerms`: disable input + button, show "Maximum 5 custom terms reached."
- Each added term shows as a removable chip with an × button

---

## `components/shared/ProcessingProgress.tsx`

**Props:**
```ts
interface ProcessingProgressProps {
  stage: 'uploading' | 'extracting' | 'processing' | 'done'
}
```

**Three steps:**
1. Extracting text — active when stage is `'uploading'` or `'extracting'`
2. Analysing with AI — active when stage is `'processing'`
3. Compiling results — active when stage is `'done'`

Each step shows: pending circle → active spinner → completed checkmark (✓).

---

## API Route — `POST /api/contracts/upload`

**File:** `app/api/contracts/upload/route.ts`  
**Auth:** Required — validate JWT from `Authorization` header or cookie.

**Request:** `multipart/form-data`
- `file` — PDF binary
- `contractType` — `"NDA"` or `"MSA"`
- `contractName` — string (optional; defaults to sanitised filename)

**Implementation steps:**
1. Extract `user_id` from Supabase session (server client)
2. Parse multipart form with `formData()` from the Next.js request
3. Validate: file exists, size ≤ 10 MB, contractType is valid
4. Insert `contracts` row: `{ user_id, name: contractName || sanitise(filename), type: contractType, contract_text: '', status: 'pending', page_count: 0 }`
5. Call `extract-text` Supabase Edge Function with `{ contract_id, file_buffer, user_id }`
6. If edge function returns `SCANNED_PDF`: delete the pending contract row, return 400
7. If edge function returns `TOO_MANY_PAGES`: delete the pending contract row, return 400
8. If edge function returns `TOKEN_LIMIT_EXCEEDED`: delete the pending contract row, return 400
9. On success: return 201 `{ contractId, pageCount, status: 'processing' }`

**Error responses:**
```
400 { error: "Please upload a PDF file." }
400 { error: "File is too large. Maximum file size is 10 MB." }
400 { error: "Document exceeds 20 pages." }
400 { error: "This appears to be a scanned PDF. Scanned PDFs are not supported yet." }
400 { error: "This contract is too long for analysis. Support for longer contracts is coming soon." }
401 { error: "Unauthorized" }
500 { error: "Upload failed. Please try again." }
```

---

## API Route — `POST /api/contracts/[id]/process`

**File:** `app/api/contracts/[id]/process/route.ts`  
**Auth:** Required; must own the contract.

**Request body:**
```json
{ "customTerms": ["string", ...] }
```

**Implementation steps:**
1. Validate `customTerms.length <= 5`; if not: return 400 `"Maximum 5 custom terms allowed."`
2. Fetch contract: `SELECT status, user_id FROM contracts WHERE id = [id]`
3. Verify `user_id = auth.uid()` — else 403
4. Verify `status === 'processing'` — else 400 `"Contract is not ready for processing."`
5. Call `process-contract` Supabase Edge Function with `{ contract_id, user_id, custom_terms }`
6. Return immediately: 202 `{ contractId, status: 'processing' }`
   - Client polls `GET /api/contracts/[id]` for status change

**Polling contract status (client-side):**
```ts
const poll = async (id: string) => {
  const res = await fetch(`/api/contracts/${id}`)
  const data = await res.json()
  if (data.status === 'complete') return data
  if (data.status === 'error') throw new Error(data.error)
  await new Promise(r => setTimeout(r, 2000))
  return poll(id)
}
```
Cap at 30 poll attempts (60 seconds); if still processing after that, show timeout error.

---

## Database Operations

**On upload:**
```sql
INSERT INTO contracts (user_id, name, type, contract_text, status, page_count)
VALUES ($user_id, $name, $type, '', 'pending', 0)
RETURNING id;
```

**After extract-text completes (done inside edge function):**
```sql
UPDATE contracts
SET contract_text = $text,
    page_count    = $page_count,
    token_count   = $token_count,
    file_path     = $file_path,   -- null if Storage upload failed
    status        = 'processing'
WHERE id = $contract_id AND user_id = $user_id;
```

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| User closes tab during processing | Contract row remains; user can return to dashboard, click contract → redirected back to processing poll |
| Storage upload fails | `file_path` set to null; text extraction continues; PDF viewer falls back to TextViewerFallback |
| PDF has 0 extractable words | Rejected as scanned PDF |
| PDF has exactly 20 pages | Accepted (limit is "exceeds 20 pages" → > 20) |
| File exactly 10 MB | Accepted (limit is > 10 MB) |
| Two rapid uploads | Each gets a separate `contract_id`; no conflict |
