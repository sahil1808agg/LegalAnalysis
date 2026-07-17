'use client'

import { ContractType } from '@/types'
import { cn } from '@/lib/utils/cn'

interface ContractTypeSelectorProps {
  value: ContractType | null
  onChange: (type: ContractType) => void
  disabled?: boolean
}

const types: { value: ContractType; label: string; description: string }[] = [
  { value: 'NDA', label: 'NDA', description: 'Non-Disclosure Agreement — 10 standard terms extracted' },
  { value: 'MSA', label: 'MSA', description: 'Master Service Agreement — 12 standard terms extracted' },
]

export function ContractTypeSelector({ value, onChange, disabled }: ContractTypeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-grey-900">Contract Type</p>
      <div className="grid grid-cols-2 gap-3">
        {types.map((t) => (
          <button
            key={t.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(t.value)}
            className={cn(
              'flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors duration-100',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              value === t.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-grey-100 bg-white hover:border-grey-200 hover:bg-grey-25'
            )}
          >
            <span className={cn('text-base font-semibold', value === t.value ? 'text-blue-500' : 'text-grey-900')}>
              {t.label}
            </span>
            <span className="text-xs text-grey-400">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
