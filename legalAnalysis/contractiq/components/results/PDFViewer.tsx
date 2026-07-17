'use client'

import { useEffect, useRef, useState } from 'react'

interface PDFViewerProps {
  signedUrl: string
  targetPage: number
  totalPages: number
}

export function PDFViewer({ signedUrl, targetPage, totalPages }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [scale, setScale] = useState(1.0)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const renderedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

        const doc = await pdfjsLib.getDocument(signedUrl).promise
        if (!cancelled) {
          setPdfDoc(doc)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setLoadError(true)
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [signedUrl])

  useEffect(() => {
    if (!pdfDoc) return
    renderedRef.current.clear()
    renderVisiblePages()
  }, [pdfDoc, scale])

  useEffect(() => {
    const idx = Math.max(0, Math.min(targetPage - 1, totalPages - 1))
    pageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [targetPage, totalPages])

  const renderPage = async (doc: unknown, pageNum: number) => {
    if (renderedRef.current.has(pageNum)) return
    renderedRef.current.add(pageNum)

    const container = pageRefs.current[pageNum - 1]
    if (!container) return

    const existingCanvas = container.querySelector('canvas')
    if (existingCanvas) existingCanvas.remove()

    try {
      const page = await (doc as { getPage: (n: number) => Promise<unknown> }).getPage(pageNum)
      const viewport = (page as { getViewport: (opts: { scale: number }) => { width: number; height: number } }).getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.className = 'w-full'
      container.appendChild(canvas)

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      await (page as { render: (opts: unknown) => { promise: Promise<void> } }).render({
        canvasContext: ctx,
        viewport,
      }).promise
    } catch {
      renderedRef.current.delete(pageNum)
    }
  }

  const renderVisiblePages = () => {
    if (!pdfDoc) return
    const doc = pdfDoc as { numPages: number }
    for (let i = 1; i <= doc.numPages; i++) {
      renderPage(pdfDoc, i)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      const next = Math.min(targetPage, totalPages - 1)
      pageRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      const prev = Math.max(targetPage - 2, 0)
      pageRefs.current[prev]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (e.key === '+' || e.key === '=') {
      setScale((s) => Math.min(s + 0.25, 3.0))
    } else if (e.key === '-') {
      setScale((s) => Math.max(s - 0.25, 0.5))
    }
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-grey-500">PDF preview unavailable.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  const doc = pdfDoc as { numPages: number }
  const pageCount = doc?.numPages ?? totalPages

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-grey-100 bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
          className="rounded px-2 py-1 text-sm text-grey-500 hover:bg-grey-25"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="text-xs text-grey-400">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(s + 0.25, 3.0))}
          className="rounded px-2 py-1 text-sm text-grey-500 hover:bg-grey-25"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-y-auto bg-grey-100 p-4 focus:outline-none"
      >
        <div className="flex flex-col gap-4">
          {Array.from({ length: pageCount }, (_, i) => (
            <div
              key={i}
              ref={(el) => { pageRefs.current[i] = el }}
              className="mx-auto max-w-full overflow-hidden rounded shadow-sm"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
