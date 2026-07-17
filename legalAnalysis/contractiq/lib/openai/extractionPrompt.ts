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

const SYSTEM_PROMPT_BASE = `You are a contract analysis expert. Extract key terms from the legal contract provided.

Return ONLY a JSON object in this exact format:
{
  "terms": [
    {
      "term_name": "string — name of the key term",
      "value": "string — the extracted value or 'Not found' if absent",
      "page_number": 1,
      "confidence_score": 0.95,
      "source_sentence": "string — verbatim sentence from the contract that contains this term"
    }
  ]
}

Rules:
- Extract every term in the list below, even if not found (set value to "Not found", confidence_score to 0.1)
- Never fabricate values — only use text present in the document
- source_sentence must be an exact quote from the document
- page_number must match the [PAGE N] markers in the document text
- confidence_score reflects how certain you are the extracted value is correct (0.0–1.0)

--- FEW-SHOT EXAMPLES ---

[NDA Example 1]
Source text: "...This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware... [PAGE 8]"
Output: { "term_name": "Governing Law", "value": "State of Delaware", "page_number": 8, "confidence_score": 0.97, "source_sentence": "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware." }

[NDA Example 2]
Source text: "...This Agreement shall remain in effect for a period of two (2) years from the Effective Date... [PAGE 3]"
Output: { "term_name": "Term & Duration", "value": "2 years from Effective Date", "page_number": 3, "confidence_score": 0.95, "source_sentence": "This Agreement shall remain in effect for a period of two (2) years from the Effective Date." }

[NDA Example 3 — term absent from document]
Output: { "term_name": "Non-Solicitation", "value": "Not found", "page_number": 1, "confidence_score": 0.1, "source_sentence": "No non-solicitation clause found in the document." }

[MSA Example 1]
Source text: "...In no event shall either party's aggregate liability exceed the total fees paid in the three (3) months preceding the claim... [PAGE 12]"
Output: { "term_name": "Liability Cap", "value": "Fees paid in the 3 months preceding the claim", "page_number": 12, "confidence_score": 0.93, "source_sentence": "In no event shall either party's aggregate liability exceed the total fees paid in the three (3) months preceding the claim." }

[MSA Example 2]
Source text: "...Invoices are due and payable within thirty (30) days of the invoice date... [PAGE 5]"
Output: { "term_name": "Payment Terms", "value": "Net 30 days from invoice date", "page_number": 5, "confidence_score": 0.96, "source_sentence": "Invoices are due and payable within thirty (30) days of the invoice date." }

[MSA Example 3]
Source text: "...Any overdue amounts shall accrue interest at a rate of 1.5% per month... [PAGE 5]"
Output: { "term_name": "Late Payment Penalty", "value": "1.5% per month on overdue amounts", "page_number": 5, "confidence_score": 0.94, "source_sentence": "Any overdue amounts shall accrue interest at a rate of 1.5% per month." }

--- END EXAMPLES ---

Extract these terms from the contract:`

export function buildExtractionPrompt(
  contractType: 'NDA' | 'MSA',
  customTerms: string[] = []
): string {
  const standardTerms = contractType === 'NDA' ? NDA_TERMS : MSA_TERMS
  const allTerms = [...standardTerms, ...customTerms]
  const termList = allTerms.map((t, i) => `${i + 1}. ${t}`).join('\n')
  return `${SYSTEM_PROMPT_BASE}\n${termList}`
}

export function getStandardTerms(contractType: 'NDA' | 'MSA'): string[] {
  return contractType === 'NDA' ? [...NDA_TERMS] : [...MSA_TERMS]
}

export function parseExtractionResponse(raw: string): Array<{
  term_name: string
  value: string
  page_number: number
  confidence_score: number
  source_sentence: string
}> | null {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.terms)) return null
    return parsed.terms.map((t: Record<string, unknown>) => ({
      term_name: String(t.term_name || ''),
      value: String(t.value || 'Not found'),
      page_number: Math.max(1, parseInt(String(t.page_number || '1')) || 1),
      confidence_score: Math.min(1, Math.max(0, parseFloat(String(t.confidence_score || '0')) || 0)),
      source_sentence: String(t.source_sentence || ''),
    })).filter((t: { term_name: string }) => t.term_name.length > 0)
  } catch {
    return null
  }
}
