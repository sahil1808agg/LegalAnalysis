import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'

// Disable the PDF.js worker — not available in Node.js serverless environments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = ''

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
  const uint8 = new Uint8Array(buffer)
  const doc = await pdfjsLib.getDocument({ data: uint8 }).promise

  const pageCount = doc.numPages

  if (pageCount > MAX_PAGES) {
    await doc.destroy()
    return { ok: false, error: 'TOO_MANY_PAGES' }
  }

  const pageTexts: string[] = []
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    pageTexts.push(`[PAGE ${i}] ${pageText}`)
    page.cleanup()
  }

  await doc.destroy()

  const segmented = pageTexts.join(' ').trim()
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
