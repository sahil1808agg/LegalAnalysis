import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'

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

  // useSystemFonts avoids the network fetch for standard font data.
  // disableRange/disableStream/disableAutoFetch prevent range-request
  // or streaming behaviour that doesn't work in a serverless context.
  const loadingTask = (pdfjsLib as any).getDocument({
    data: uint8,
    useSystemFonts: true,
    isEvalSupported: false,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
  })

  const doc = await loadingTask.promise
  const pageCount: number = doc.numPages

  if (pageCount > MAX_PAGES) {
    await doc.destroy()
    return { ok: false, error: 'TOO_MANY_PAGES' }
  }

  const pageTexts: string[] = []
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = (content.items as Array<{ str?: string }>)
      .map((item) => item.str ?? '')
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
