import { KeyTerm } from '@/types'
import { TermCard } from './TermCard'

interface KeyTermsPanelProps {
  terms: KeyTerm[]
  onPageSelect: (page: number) => void
  onTermUpdate: (termId: string, newValue: string) => Promise<void>
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-grey-100 bg-white p-4 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-grey-100" />
      <div className="mt-3 h-3 w-2/3 rounded bg-grey-100" />
      <div className="mt-2 h-3 w-1/2 rounded bg-grey-100" />
      <div className="mt-3 h-3 w-1/4 rounded bg-grey-100" />
    </div>
  )
}

export function KeyTermsPanel({ terms, onPageSelect, onTermUpdate }: KeyTermsPanelProps) {
  if (terms.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const standard = terms.filter((t) => !t.isCustom)
  const custom = terms.filter((t) => t.isCustom)
  const ordered = [...standard, ...custom]

  return (
    <div className="flex flex-col gap-3">
      {ordered.map((term) => (
        <TermCard
          key={term.id}
          term={term}
          onPageSelect={onPageSelect}
          onUpdate={onTermUpdate}
        />
      ))}
    </div>
  )
}
