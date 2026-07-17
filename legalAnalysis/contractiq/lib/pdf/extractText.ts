import { PDFParse } from 'pdf-parse'

const MAX_PAGES = 20
const MIN_WORDS = 100
const MAX_TOKENS = 15000

export interface ExtractResult {
  text: string
  pageCount: number
  tokenCount: number
}

export type ExtractError = 'SCANNED_PDF' | 'TOO_MANY_PAGES' | 'TOKEN_LIMIT_EXCEEDED'

export async function extractPDFText(
  buffer: Buffer
): Promise<{ ok: true; result: ExtractResult } | { ok: false; error: ExtractError }> {
  const parser = new PDFParse({ data: buffer })

  let result: Awaited<ReturnType<typeof parser.getText>>
  try {
    result = await parser.getText()
  } finally {
    await parser.destroy()
  }

  const pageCount = result.total

  if (pageCount > MAX_PAGES) {
    return { ok: false, error: 'TOO_MANY_PAGES' }
  }

  // Build segmented text with [PAGE N] markers
  const segmented = result.pages.length > 0
    ? result.pages
        .map((p) => `[PAGE ${p.num}] ${p.text.trim()}`)
        .join(' ')
        .trim()
    : `[PAGE 1] ${result.text.trim()}`

  const wordCount = segmented.split(/\s+/).filter(Boolean).length
  if (wordCount < MIN_WORDS) {
    return { ok: false, error: 'SCANNED_PDF' }
  }

  const tokenCount = Math.ceil(segmented.length / 4)
  if (tokenCount > MAX_TOKENS) {
    return { ok: false, error: 'TOKEN_LIMIT_EXCEEDED' }
  }

  return { ok: true, result: { text: segmented, pageCount, tokenCount } }
}
