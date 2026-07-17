'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-grey-900">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-md border px-3 py-2.5 text-sm text-grey-900',
            'placeholder:text-grey-300',
            'transition-colors duration-100 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:border-blue-500',
            'disabled:bg-grey-25 disabled:text-grey-400 disabled:cursor-not-allowed',
            error
              ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
              : 'border-grey-100 bg-white hover:border-grey-200',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-700">{error}</p>}
        {hint && !error && <p className="text-xs text-grey-400">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
