// Returns Tailwind classes matching the design system confidence score colors
export function confidenceToClasses(score: number): string {
  if (score >= 0.9) return 'bg-green-100 text-green-700'   // #16A34A range
  if (score >= 0.7) return 'bg-lime-100 text-lime-700'     // #84CC16 range
  if (score >= 0.5) return 'bg-amber-100 text-amber-700'   // #F59E0B range
  return 'bg-red-100 text-red-700'                          // #DC2626 range — warn
}

export function confidenceToLabel(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function isLowConfidence(score: number): boolean {
  return score < 0.5
}
