'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

interface DropzoneUploaderProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  disabled?: boolean
  error?: string | null
}

export function DropzoneUploader({
  onFileSelect,
  selectedFile,
  onClear,
  disabled,
  error,
}: DropzoneUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function validateAndSelect(file: File) {
    setValidationError(null)
    if (file.type !== 'application/pdf') {
      setValidationError('Only PDF files are accepted.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`File must be under ${MAX_FILE_SIZE_MB} MB.`)
      return
    }
    onFileSelect(file)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) validateAndSelect(file)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled]
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
    e.target.value = ''
  }

  const displayError = validationError ?? error

  if (selectedFile) {
    return (
      <div className="border-2 border-primary rounded-xl bg-blue-50 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{selectedFile.name}</p>
            <p className="text-xs text-text-secondary">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · PDF
            </p>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0 ml-3"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload PDF"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl px-6 py-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          dragging
            ? 'border-primary bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-blue-50/40'
        }`}
      >
        <div className="rounded-full bg-gray-100 p-3">
          <Upload className="h-6 w-6 text-text-secondary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">
            Drop your PDF here, or{' '}
            <span className="text-primary underline underline-offset-2">browse</span>
          </p>
          <p className="text-xs text-text-secondary mt-1">
            PDF only · Max {MAX_FILE_SIZE_MB} MB · Up to 20 pages
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {displayError && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {displayError}
        </div>
      )}
    </div>
  )
}
