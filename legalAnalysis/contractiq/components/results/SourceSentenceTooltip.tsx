'use client'

import { useState } from 'react'

interface SourceSentenceTooltipProps {
  sourceSentence: string
}

export function SourceSentenceTooltip({ sourceSentence }: SourceSentenceTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o) } }}
        className="text-xs text-grey-400 underline-offset-2 hover:text-grey-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
        aria-expanded={open}
      >
        {open ? 'Hide source ↑' : 'Why? ↓'}
      </button>
      {open && (
        <blockquote className="mt-2 rounded border-l-2 border-blue-200 bg-blue-50 px-3 py-2 font-mono text-xs leading-relaxed text-grey-600">
          "{sourceSentence}"
        </blockquote>
      )}
    </div>
  )
}
