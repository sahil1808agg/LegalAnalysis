import { cn } from '@/lib/utils/cn'

interface ConfidenceBadgeProps {
  score: number
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const pct = Math.round(score * 100)

  const isHigh = score >= 0.8
  const isMid = score >= 0.5 && score < 0.8
  const isLow = score < 0.5

  const label = isHigh ? 'high' : isLow ? 'low — verify manually' : 'medium'

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium',
          isHigh && 'border-green-500 bg-green-50 text-green-700',
          isMid && 'border-yellow-500 bg-yellow-50 text-yellow-800',
          isLow && 'border-red-500 bg-red-50 text-red-700'
        )}
        aria-label={`Confidence: ${pct}%, ${label}`}
      >
        {isHigh && <span aria-hidden>✓</span>}
        {isLow && <span aria-hidden>⚠</span>}
        {pct}%
      </span>
      {isLow && (
        <p className="text-xs text-red-600">
          Low confidence — we recommend verifying this in the document directly.
        </p>
      )}
    </div>
  )
}
