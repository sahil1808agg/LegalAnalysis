'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

interface PDFUploaderProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  selectedFile: File | null
}

export function PDFUploader({ onFileSelect, disabled, selectedFile }: PDFUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const validate = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.pdf')) return 'Please upload a PDF file.'
    if (file.size > MAX_SIZE_BYTES) return 'File is too large. Maximum file size is 10 MB.'
    return null
  }

  const handleFile = (file: File) => {
    const err = validate(file)
    if (err) { setValidationError(err); return }
    setValidationError(null)
    onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-grey-900">PDF File</p>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors duration-100',
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-grey-100 hover:border-grey-200 hover:bg-grey-25',
          selectedFile && 'border-green-500 bg-green-50',
          disabled && 'cursor-not-allowed opacity-50',
          validationError && 'border-red-500 bg-red-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
        {selectedFile ? (
          <>
            <span className="text-2xl">📄</span>
            <p className="mt-2 text-sm font-medium text-green-700">{selectedFile.name}</p>
            <p className="text-xs text-grey-400">
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB — click to replace
            </p>
          </>
        ) : (
          <>
            <span className="text-2xl">☁</span>
            <p className="mt-2 text-sm font-medium text-grey-900">
              Drop your PDF here or{' '}
              <span className="text-blue-500 underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-grey-400">PDF only · max 10 MB · max 20 pages</p>
          </>
        )}
      </div>
      {validationError && <p className="text-xs text-red-700">{validationError}</p>}
    </div>
  )
}
