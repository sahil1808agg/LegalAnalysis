'use client'

import { Loader2, AlertCircle } from 'lucide-react'

interface ProcessingIndicatorProps {
  status: 'pending' | 'processing' | 'error'
  errorMessage: string | null
  onRetry?: () => void
}

export function ProcessingIndicator({ status, errorMessage, onRetry }: ProcessingIndicatorProps) {
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="rounded-full bg-red-100 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-2">Extraction failed</h3>
        <p className="text-sm text-text-secondary max-w-sm mb-6">
          {errorMessage ?? 'An error occurred while processing this contract.'}
        </p>
        {onRetry && (
          <button onClick={onRetry} className="btn-primary text-sm">
            Try Again
          </button>
        )}
      </div>
    )
  }

  const label = status === 'processing'
    ? 'Extracting key terms…'
    : 'Preparing your contract…'

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="rounded-full bg-blue-50 p-4 mb-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">{label}</h3>
      <p className="text-sm text-text-secondary max-w-sm">
        This usually takes 15–30 seconds. You can stay on this page or come back later.
      </p>
    </div>
  )
}
