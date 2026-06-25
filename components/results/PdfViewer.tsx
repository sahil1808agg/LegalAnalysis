'use client'

import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { TextViewer } from './TextViewer'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PdfViewerProps {
  contractId: string
  contractText: string
  targetPage: number | null
  totalPages: number | null
}

const ZOOM_STEP = 0.2
const MIN_ZOOM = 0.6
const MAX_ZOOM = 2.0

export function PdfViewer({ contractId, contractText, targetPage, totalPages }: PdfViewerProps) {
  const { url, loading, error } = useSignedUrl(contractId)
  const [numPages, setNumPages] = useState<number>(totalPages ?? 0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)

  // Sync targetPage prop to internal page state
  useEffect(() => {
    if (targetPage != null && targetPage >= 1 && targetPage <= numPages) {
      setCurrentPage(targetPage)
    }
  }, [targetPage, numPages])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-text-secondary">
        Loading PDF…
      </div>
    )
  }

  // Fall back to text viewer when PDF is unavailable
  if (error || !url) {
    return <TextViewer text={contractText} targetPage={targetPage} />
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-text-secondary min-w-[80px] text-center">
            {currentPage} / {numPages || '–'}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(MIN_ZOOM, s - ZOOM_STEP))}
            disabled={scale <= MIN_ZOOM}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-text-secondary w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(MAX_ZOOM, s + ZOOM_STEP))}
            disabled={scale >= MAX_ZOOM}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF canvas */}
      <div className="flex-1 overflow-auto flex justify-center py-4">
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={() => {
            // Fall back handled by the outer error check; re-render happens naturally
          }}
          loading={
            <div className="flex items-center justify-center py-16 text-sm text-text-secondary">
              Loading document…
            </div>
          }
          error={
            <div className="flex items-center justify-center py-16 text-sm text-red-600">
              Failed to load PDF.
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderAnnotationLayer
            renderTextLayer
          />
        </Document>
      </div>
    </div>
  )
}
