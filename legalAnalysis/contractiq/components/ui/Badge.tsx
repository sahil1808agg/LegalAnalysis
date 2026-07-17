import { cn } from '@/lib/utils/cn'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'custom'
  className?: string
  children: React.ReactNode
}

const variantClasses = {
  success: 'bg-green-50 border-green-500 text-green-700',
  warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  error: 'bg-red-50 border-red-500 text-red-700',
  info: 'bg-blue-50 border-blue-200 text-blue-500',
  neutral: 'bg-grey-50 border-grey-200 text-grey-500',
  custom: '',
}

export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
