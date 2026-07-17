# Spec 03 — AI Key Term Extraction

## Overview

After text extraction, the `process-contract` Supabase Edge Function calls GPT-4o with a few-shot prompt to extract structured key terms. Results are stored in the `key_terms` table. This spec covers the extraction prompt, response schema, retry logic, and the Edge Function implementation.

---

## Acceptance Criteria

- ≥ 10 standard terms extracted per NDA contract; ≥ 12 per MSA
- Every term has: term_name, value, page_number (1-indexed), confidence_score (0.0–1.0), source_sentence
- Confidence scores reflect model certainty — not all terms return 0.9+
- Custom terms (if present) appear in results with `is_custom = true` and the same data structure
- Extraction completes in ≤ 30 s P95 for contracts ≤ 20 pages
- On JSON parse failure: retry once with a corrective prompt
- On OpenAI API error: retry 3× with exponential backoff (1s, 2s, 4s)
- On all retries exhausted: `contracts.status` set to `'error'`; human-readable error returned
- Contracts > 15,000 tokens are rejected before calling OpenAI

---

## Files to Create

```
supabase/
└── functions/
    └── process-contract/
        └── index.ts          ← Deno Edge Function

contractiq/
└── lib/
    └── openai/
        ├── client.ts         ← OpenAI client (server-only)
        └── extractionPrompt.ts ← Builds NDA/MSA few-shot prompt
```

---

## Standard Term Lists

### NDA (10 terms)
1. Parties
2. Effective Date
3. Confidentiality Obligations
4. Permitted Disclosures
5. Term & Duration
6. Governing Law
7. Jurisdiction
8. IP Ownership
9. Non-Solicitation
10. Breach & Remedy

### MSA (12 terms)
1. Parties
2. Service Scope
3. Payment Terms
4. Invoice Schedule
5. Late Payment Penalty
6. Liability Cap
7. Indemnification
8. IP Ownership
9. Termination Clause
10. Governing Law
11. Dispute Resolution
12. Notice Period

---

## GPT-4o Call Parameters

```ts
{
  model: 'gpt-4o',
  response_format: { type: 'json_object' },
  temperature: 0.1,
  max_tokens: 2000,
  user: sha256(user_id),   // hashed user ID for OpenAI abuse detection
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user',   content: CONTRACT_TEXT }
  ]
}
```

---

## Extraction Prompt — `lib/openai/extractionPrompt.ts`

### System Prompt Structure

```
You are a contract analysis expert. Extract key terms from the legal contract provided.

Return ONLY a JSON object in this exact format:
{
  "terms": [
    {
      "term_name": "string — name of the key term",
      "value": "string — the extracted value or 'Not found' if absent",
      "page_number": number — 1-indexed page where the term appears (use 1 if unclear),
      "confidence_score": number — your confidence from 0.0 to 1.0,
      "source_sentence": "string — verbatim sentence from the contract that contains this term"
    }
  ]
}

Rules:
- Extract every term in the list below, even if not found (set value to "Not found", confidence_score to 0.1)
- Never fabricate values — only use text present in the document
- source_sentence must be an exact quote from the document
- page_number must match the [PAGE N] markers in the document text
- confidence_score reflects how certain you are the extracted value is correct

--- FEW-SHOT EXAMPLES ---

[NDA Example 1]
Term: Governing Law
Source text: "...This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware... [PAGE 8]"
Output: { "term_name": "Governing Law", "value": "State of Delaware", "page_number": 8, "confidence_score": 0.97, "source_sentence": "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware." }

[NDA Example 2]
Term: Term & Duration
Source text: "...This Agreement shall remain in effect for a period of two (2) years from the Effective Date... [PAGE 3]"
Output: { "term_name": "Term & Duration", "value": "2 years from Effective Date", "page_number": 3, "confidence_score": 0.95, "source_sentence": "This Agreement shall remain in effect for a period of two (2) years from the Effective Date." }

[NDA Example 3]
Term: Non-Solicitation
Source text (absent from document — no relevant clause found)
Output: { "term_name": "Non-Solicitation", "value": "Not found", "page_number": 1, "confidence_score": 0.1, "source_sentence": "No non-solicitation clause found in the document." }

[MSA Example 1]
Term: Liability Cap
Source text: "...In no event shall either party's aggregate liability exceed the total fees paid in the three (3) months preceding the claim... [PAGE 12]"
Output: { "term_name": "Liability Cap", "value": "Fees paid in the 3 months preceding the claim", "page_number": 12, "confidence_score": 0.93, "source_sentence": "In no event shall either party's aggregate liability exceed the total fees paid in the three (3) months preceding the claim." }

[MSA Example 2]
Term: Payment Terms
Source text: "...Invoices are due and payable within thirty (30) days of the invoice date... [PAGE 5]"
Output: { "term_name": "Payment Terms", "value": "Net 30 days from invoice date", "page_number": 5, "confidence_score": 0.96, "source_sentence": "Invoices are due and payable within thirty (30) days of the invoice date." }

[MSA Example 3]
Term: Late Payment Penalty
Source text: "...Any overdue amounts shall accrue interest at a rate of 1.5% per month... [PAGE 5]"
Output: { "term_name": "Late Payment Penalty", "value": "1.5% per month on overdue amounts", "page_number": 5, "confidence_score": 0.94, "source_sentence": "Any overdue amounts shall accrue interest at a rate of 1.5% per month." }

--- END EXAMPLES ---

Extract these terms from the contract:
[TERM LIST — injected based on contract type + custom terms]
```

### `buildExtractionPrompt(type, customTerms)` Function

```ts
export function buildExtractionPrompt(
  contractType: 'NDA' | 'MSA',
  customTerms: string[] = []
): string {
  const standardTerms = contractType === 'NDA' ? NDA_TERMS : MSA_TERMS
  const allTerms = [...standardTerms, ...customTerms]
  const termList = allTerms.map((t, i) => `${i + 1}. ${t}`).join('\n')

  return SYSTEM_PROMPT_BASE + '\n\n' + termList
}
```

---

## Response Parsing

### Valid response:
```json
{
  "terms": [
    {
      "term_name": "Governing Law",
      "value": "State of Delaware",
      "page_number": 8,
      "confidence_score": 0.97,
      "source_sentence": "This Agreement shall be governed by..."
    }
  ]
}
```

### Validation rules per term:
- `term_name`: non-empty string
- `value`: non-empty string
- `page_number`: integer ≥ 1; if missing/invalid → default to 1
- `confidence_score`: float 0.0–1.0; if out of range → clamp to [0, 1]
- `source_sentence`: non-empty string

### Retry prompt (on JSON parse failure):
```
Your previous response was not valid JSON. Return ONLY the JSON object {"terms": [...]}, no explanation, no markdown, no code block.
```

---

## `supabase/functions/process-contract/index.ts`

```ts
// Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

serve(async (req) => {
  const { contract_id, user_id, custom_terms = [] } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

  // 1. Fetch contract text and type
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('contract_text, type')
    .eq('id', contract_id)
    .eq('user_id', user_id)
    .single()

  if (error || !contract) {
    return new Response(JSON.stringify({ error: 'Contract not found' }), { status: 404 })
  }

  // 2. Build prompt
  const systemPrompt = buildExtractionPrompt(contract.type, custom_terms)

  // 3. Call GPT-4o with retry logic
  let terms = null
  let lastError = null

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(Math.pow(2, attempt - 1) * 1000)
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contract.contract_text }
        ]
      })
      const raw = completion.choices[0].message.content ?? ''
      terms = parseExtractionResponse(raw)
      if (terms) break

      // JSON parse failed — retry with corrective prompt
      if (attempt === 0) {
        const retry = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 2000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contract.contract_text },
            { role: 'assistant', content: raw },
            { role: 'user', content: 'Your previous response was not valid JSON. Return ONLY the JSON object {"terms": [...]}, no explanation.' }
          ]
        })
        terms = parseExtractionResponse(retry.choices[0].message.content ?? '')
        if (terms) break
      }
    } catch (err) {
      lastError = err
    }
  }

  if (!terms) {
    await supabase.from('contracts').update({ status: 'error' }).eq('id', contract_id)
    return new Response(
      JSON.stringify({ error: 'Analysis failed. Please try again in a few minutes.' }),
      { status: 500 }
    )
  }

  // 4. Bulk insert key_terms
  const rows = terms.map((t: any) => ({
    contract_id,
    user_id,
    term_name: t.term_name,
    value: t.value,
    page_number: Math.max(1, parseInt(t.page_number) || 1),
    confidence_score: Math.min(1, Math.max(0, parseFloat(t.confidence_score) || 0)),
    source_sentence: t.source_sentence || '',
    is_custom: custom_terms.includes(t.term_name),
  }))

  await supabase.from('key_terms').insert(rows)

  // 5. Mark complete
  await supabase.from('contracts').update({ status: 'complete' }).eq('id', contract_id)

  return new Response(JSON.stringify({ terms_count: rows.length, contract_id }), { status: 200 })
})
```

---

## Token Counting

Estimate tokens before calling OpenAI: approximate as `Math.ceil(text.length / 4)`.  
If estimated tokens > 15,000: return error from the upload route before the extraction is triggered.  
This check runs in the `extract-text` edge function after pdf-parse completes.

---

## Error Handling

| Error | Behaviour |
|---|---|
| OpenAI 5xx / network error | Retry 3× with backoff (1s, 2s, 4s); after 3 fails → `status='error'` |
| Invalid JSON from OpenAI | Retry once with corrective prompt; if still invalid → counts as one retry attempt |
| OpenAI 429 (rate limit) | Same retry logic as 5xx |
| OpenAI 400 (bad request) | Do not retry; set `status='error'`; log error server-side |
| term missing `page_number` | Default to 1 |
| `confidence_score` out of range | Clamp to [0, 1] |
