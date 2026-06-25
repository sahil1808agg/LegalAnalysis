'use client'

import { useEffect, useRef } from 'react'

interface TextViewerProps {
  text: string
  targetPage: number | null
}

// Parses [PAGE N] markers from the contract text and splits into page segments
function parsePages(text: string): Array<{ page: number; content: string }> {
  const segments: Array<{ page: number; content: string }> = []
  const pageRegex = /\[PAGE (\d+)\]/g

  let lastIndex = 0
  let lastPage = 1
  let match: RegExpExecArray | null

  while ((match = pageRegex.exec(text)) !== null) {
    const pageNum = parseInt(match[1], 10)
    const before = text.slice(lastIndex, match.index).trim()
    if (before && segments.length > 0) {
      segments[segments.length - 1].content += '\n\n' + before
    } else if (before) {
      segments.push({ page: lastPage, content: before })
    }
    lastPage = pageNum
    lastIndex = match.index + match[0].length
  }

  const remainder = text.slice(lastIndex).trim()
  if (remainder) {
    segments.push({ page: lastPage, content: remainder })
  }

  return segments.length > 0 ? segments : [{ page: 1, content: text }]
}

export function TextViewer({ text, targetPage }: TextViewerProps) {
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (targetPage == null) return
    const el = pageRefs.current.get(targetPage)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [targetPage])

  const pages = parsePages(text)

  return (
    <div className="h-full overflow-y-auto px-6 py-4 font-mono text-sm leading-relaxed text-text-primary bg-white">
      {pages.map(({ page, content }) => (
        <div
          key={page}
          ref={(el) => {
            if (el) pageRefs.current.set(page, el)
            else pageRefs.current.delete(page)
          }}
          className="mb-6"
        >
          <div className="text-xs text-text-secondary font-sans mb-2 pb-1 border-b border-gray-100">
            Page {page}
          </div>
          <pre className="whitespace-pre-wrap break-words">{content}</pre>
        </div>
      ))}
    </div>
  )
}
