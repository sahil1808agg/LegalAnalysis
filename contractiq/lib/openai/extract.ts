import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ExtractedTerm {
  term_name: string
  value: string
  page_number: number
  confidence_score: number
  source_sentence: string
}

const NDA_TERMS = [
  'Parties',
  'Effective Date',
  'Confidentiality Obligations',
  'Permitted Disclosures',
  'Term & Duration',
  'Governing Law',
  'Jurisdiction',
  'IP Ownership',
  'Non-Solicitation',
  'Breach & Remedy',
]

const MSA_TERMS = [
  'Parties',
  'Service Scope',
  'Payment Terms',
  'Invoice Schedule',
  'Late Payment Penalty',
  'Liability Cap',
  'Indemnification',
  'IP Ownership',
  'Termination Clause',
  'Governing Law',
  'Dispute Resolution',
  'Notice Period',
]

export function getStandardTerms(contractType: 'NDA' | 'MSA'): string[] {
  return contractType === 'NDA' ? NDA_TERMS : MSA_TERMS
}

const SYSTEM_PROMPT = `You are a legal contract analyst. Extract the specified key terms from the contract text provided.

Return ONLY a valid JSON array. Each element must have exactly these fields:
- "term_name": string — the name of the term as given
- "value": string — the extracted value from the contract (verbatim where possible)
- "page_number": integer — the page number where the term appears (use [PAGE N] markers in the text)
- "confidence_score": float between 0.0 and 1.0 — your confidence in the extraction
- "source_sentence": string — the verbatim sentence or clause you used to extract this value

If a term is NOT found in the contract, still include it with:
  value: "Not found", confidence_score: 0.0, page_number: 0, source_sentence: ""

EXAMPLE — NDA contract snippet:
Contract text: "[PAGE 1]\nThis Non-Disclosure Agreement ('Agreement') is entered into as of March 1, 2025, between Acme Technologies Inc. ('Disclosing Party') and Beta Solutions Ltd ('Receiving Party').\n\n[PAGE 2]\nRecipient shall maintain the Confidential Information in strict confidence for a period of three (3) years from the Effective Date. This Agreement shall be governed by the laws of the State of Delaware."

Terms to extract: Parties, Effective Date, Confidentiality Obligations, Governing Law

Expected output:
[
  {"term_name":"Parties","value":"Acme Technologies Inc. (Disclosing Party) and Beta Solutions Ltd (Receiving Party)","page_number":1,"confidence_score":0.97,"source_sentence":"This Non-Disclosure Agreement is entered into as of March 1, 2025, between Acme Technologies Inc. ('Disclosing Party') and Beta Solutions Ltd ('Receiving Party')."},
  {"term_name":"Effective Date","value":"March 1, 2025","page_number":1,"confidence_score":0.99,"source_sentence":"This Non-Disclosure Agreement is entered into as of March 1, 2025."},
  {"term_name":"Confidentiality Obligations","value":"Maintain in strict confidence for 3 years from Effective Date","page_number":2,"confidence_score":0.93,"source_sentence":"Recipient shall maintain the Confidential Information in strict confidence for a period of three (3) years from the Effective Date."},
  {"term_name":"Governing Law","value":"State of Delaware","page_number":2,"confidence_score":0.98,"source_sentence":"This Agreement shall be governed by the laws of the State of Delaware."}
]

EXAMPLE — MSA contract snippet:
Contract text: "[PAGE 1]\nThis Master Service Agreement is made between Horizon Corp ('Client') and Vertex Services Inc. ('Service Provider') effective January 10, 2025.\n\n[PAGE 3]\nClient shall pay Service Provider USD 15,000 per month, invoiced on the first business day of each month, due within 30 days. Late payments shall accrue interest at 1.5% per month. Service Provider's total liability shall not exceed the fees paid in the preceding 3 months."

Terms to extract: Parties, Payment Terms, Invoice Schedule, Late Payment Penalty, Liability Cap

Expected output:
[
  {"term_name":"Parties","value":"Horizon Corp (Client) and Vertex Services Inc. (Service Provider)","page_number":1,"confidence_score":0.96,"source_sentence":"This Master Service Agreement is made between Horizon Corp ('Client') and Vertex Services Inc. ('Service Provider')."},
  {"term_name":"Payment Terms","value":"USD 15,000 per month, due within 30 days of invoice","page_number":3,"confidence_score":0.95,"source_sentence":"Client shall pay Service Provider USD 15,000 per month, invoiced on the first business day of each month, due within 30 days."},
  {"term_name":"Invoice Schedule","value":"First business day of each month","page_number":3,"confidence_score":0.97,"source_sentence":"Client shall pay Service Provider USD 15,000 per month, invoiced on the first business day of each month."},
  {"term_name":"Late Payment Penalty","value":"1.5% per month on overdue amounts","page_number":3,"confidence_score":0.94,"source_sentence":"Late payments shall accrue interest at 1.5% per month."},
  {"term_name":"Liability Cap","value":"Fees paid in the preceding 3 months","page_number":3,"confidence_score":0.91,"source_sentence":"Service Provider's total liability shall not exceed the fees paid in the preceding 3 months."}
]

Do not include any text outside the JSON array. Do not add markdown fences.`

const RETRY_PROMPT =
  'Your previous response was not valid JSON. Return ONLY the JSON array with no explanation, no markdown, no code fences.'

async function callOpenAI(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 2000,
  })
  return response.choices[0]?.message?.content ?? ''
}

function parseTermsJson(raw: string): ExtractedTerm[] {
  const trimmed = raw.trim()
  // Handle both {"terms":[...]} and direct [...] formats
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error('Invalid JSON')
  }

  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>).terms ?? (parsed as Record<string, unknown>).data ?? null

  if (!Array.isArray(arr)) throw new Error('Expected a JSON array')

  return arr.map((item: unknown) => {
    const t = item as Record<string, unknown>
    return {
      term_name: String(t.term_name ?? ''),
      value: String(t.value ?? 'Not found'),
      page_number: typeof t.page_number === 'number' ? t.page_number : 0,
      confidence_score:
        typeof t.confidence_score === 'number'
          ? Math.min(1, Math.max(0, t.confidence_score))
          : 0,
      source_sentence: String(t.source_sentence ?? ''),
    }
  })
}

export async function extractKeyTerms(
  contractText: string,
  contractType: 'NDA' | 'MSA',
  customTerms: string[] = []
): Promise<ExtractedTerm[]> {
  const standardTerms = getStandardTerms(contractType)
  const allTerms = [...standardTerms, ...customTerms]

  const userMessage = `Contract type: ${contractType}
Terms to extract: ${allTerms.join(', ')}

Contract text:
${contractText}`

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]

  let lastError: Error | null = null

  // Up to 3 attempts: 2 retries on API error, 1 retry on JSON parse error
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await callOpenAI(messages)

      try {
        return parseTermsJson(raw)
      } catch {
        // JSON parse failed — send correction prompt
        messages.push({ role: 'assistant', content: raw })
        messages.push({ role: 'user', content: RETRY_PROMPT })
        const retryRaw = await callOpenAI(messages)
        return parseTermsJson(retryRaw)
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < 2) {
        await sleep(Math.pow(2, attempt) * 2000)
      }
    }
  }

  throw lastError ?? new Error('Key term extraction failed after retries')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
