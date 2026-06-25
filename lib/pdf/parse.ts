import pdf from 'pdf-parse'

export interface ParsedPdf {
  text: string
  pageCount: number
  wordCount: number
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const pageTexts: string[] = []

  const data = await pdf(buffer, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pagerender: async (pageData: any) => {
      try {
        const textContent = await pageData.getTextContent()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        pageTexts.push(pageText)
        return pageText
      } catch {
        pageTexts.push('')
        return ''
      }
    },
  })

  // If pagerender populated pages use them; otherwise fall back to form-feed splitting
  const finalPages =
    pageTexts.length > 0
      ? pageTexts
      : data.text
          .split('\f')
          .map((p) => p.trim())
          .filter((p) => p.length > 0)

  const text = finalPages
    .map((pageText, idx) => `[PAGE ${idx + 1}]\n${pageText}`)
    .join('\n\n')

  const wordCount = text
    .split(/\s+/)
    .filter((w) => w.length > 0 && !w.match(/^\[PAGE \d+\]$/)).length

  return {
    text,
    pageCount: data.numpages,
    wordCount,
  }
}
