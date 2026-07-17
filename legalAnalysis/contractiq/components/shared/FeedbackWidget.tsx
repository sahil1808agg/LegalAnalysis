'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

interface FeedbackWidgetProps {
  contractId: string
}

export function FeedbackWidget({ contractId }: FeedbackWidgetProps) {
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/contracts/${contractId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      })

      if (res.status === 409) {
        setError("You've already submitted feedback for this contract.")
        return
      }

      if (!res.ok) {
        setError('Feedback failed. Please try again.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Feedback failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <p className="text-sm font-medium text-green-700">Thank you for your feedback!</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-grey-100 bg-white p-4">
      <p className="text-sm font-medium text-grey-900">Was this analysis helpful?</p>

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => setRating('up')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition-colors',
            rating === 'up'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-grey-100 text-grey-500 hover:border-grey-200 hover:bg-grey-25'
          )}
          aria-pressed={rating === 'up'}
        >
          👍 Yes
        </button>
        <button
          type="button"
          onClick={() => setRating('down')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition-colors',
            rating === 'down'
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-grey-100 text-grey-500 hover:border-grey-200 hover:bg-grey-25'
          )}
          aria-pressed={rating === 'down'}
        >
          👎 No
        </button>
      </div>

      {rating && (
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any comments? (optional)"
            rows={2}
            disabled={submitting}
            className="w-full resize-none rounded-lg border border-grey-100 px-3 py-2 text-sm text-grey-900 placeholder:text-grey-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
            loading={submitting}
            className="self-start"
          >
            Submit feedback
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
