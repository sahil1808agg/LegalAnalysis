import { cn } from '@/lib/utils/cn'

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorBanner({ message, onRetry, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border border-red-500 bg-red-50 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-red-500 text-sm">⚠</span>
        <p className="text-sm font-medium text-red-700">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 text-xs font-medium text-red-700 underline hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}
