'use client'

import { confidenceToClasses, confidenceToLabel, isLowConfidence } from '@/lib/utils/confidence'
import { AlertTriangle } from 'lucide-react'

interface ConfidenceBadgeProps {
  score: number
  showLabel?: boolean
}

export function ConfidenceBadge({ score, showLabel = false }: ConfidenceBadgeProps) {
  const classes = confidenceToClasses(score)
  const label = confidenceToLabel(score)
  const warn = isLowConfidence(score)

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {warn && <AlertTriangle className="h-3 w-3 shrink-0" />}
      {showLabel ? label : `${Math.round(score * 100)}%`}
    </span>
  )
}
