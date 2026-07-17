import { cn } from '@/lib/utils/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

export function Card({ className, children, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-grey-100 bg-white p-6',
        onClick && 'cursor-pointer hover:border-grey-200 hover:bg-grey-25 transition-colors duration-100',
        className
      )}
    >
      {children}
    </div>
  )
}
