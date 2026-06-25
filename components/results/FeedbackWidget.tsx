'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react'

interface FeedbackWidgetProps {
  contractId: string
}

type FeedbackState = 'idle' | 'selected_up' | 'selected_down' | 'submitted' | 'error'

export function FeedbackWidget({ contractId }: FeedbackWidgetProps) {
  const [state, setState] = useState<FeedbackState>('idle')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState<'up' | 'down' | null>(null)

  function selectRating(r: 'up' | 'down') {
    setRating(r)
    setState(r === 'up' ? 'selected_up' : 'selected_down')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, rating, comment: comment.trim() || undefined }),
      })

      if (res.status === 409) {
        setState('submitted')
        return
      }

      if (!res.ok) {
        setState('error')
        return
      }

      setState('submitted')
    } catch {
      setState('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'submitted') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700">
        <CheckCircle className="h-4 w-4" />
        Thanks for your feedback!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary font-medium">Was this extraction helpful?</span>
        <button
          type="button"
          onClick={() => selectRating('up')}
          className={`p-1.5 rounded transition-colors ${
            rating === 'up' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
          }`}
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => selectRating('down')}
          className={`p-1.5 rounded transition-colors ${
            rating === 'down' ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          }`}
          aria-label="Thumbs down"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>

      {(state === 'selected_up' || state === 'selected_down') && (
        <div className="flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: Any specific feedback? (max 500 chars)"
            className="input text-xs py-2 resize-none h-16"
            maxLength={500}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => { setState('idle'); setRating(null); setComment('') }}
              className="btn-ghost text-xs py-1.5 px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <p className="text-xs text-red-600">Failed to submit. Please try again.</p>
      )}
    </form>
  )
}
