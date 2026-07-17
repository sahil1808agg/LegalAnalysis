'use client'

import { useEffect, useRef } from 'react'

interface TextViewerFallbackProps {
  contractText: string
  targetPage: number
}

function parsePages(text: string): string[] {
  const parts = text.split(/\[PAGE \d+\]/)
  return parts.filter((p) => p.trim().length > 0)
}

export function TextViewerFallback({ contractText, targetPage }: TextViewerFallbackProps) {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const pages = parsePages(contractText)

  useEffect(() => {
    const idx = Math.max(0, Math.min(targetPage - 1, pages.length - 1))
    pageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [targetPage, pages.length])

  if (pages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-grey-400">
        No text content available.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {pages.map((content, i) => (
        <div
          key={i}
          ref={(el) => { pageRefs.current[i] = el }}
          className="rounded-lg border border-grey-100 bg-white"
        >
          <div className="border-b border-grey-100 px-4 py-2">
            <span className="text-xs font-medium text-grey-400">Page {i + 1}</span>
          </div>
          <div className="px-4 py-3 font-mono text-sm leading-relaxed text-grey-900 whitespace-pre-wrap">
            {content.trim()}
          </div>
        </div>
      ))}
    </div>
  )
}
