import Link from 'next/link'
import { FileText } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
}

export default function EmptyState({ title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent-light flex items-center justify-center mb-4">
        <FileText size={24} color="#112E81" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs mb-6">{description}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary text-sm">
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}
