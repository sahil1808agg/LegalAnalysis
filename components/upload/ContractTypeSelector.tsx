'use client'

import { ContractType } from '@/types'

interface ContractTypeSelectorProps {
  value: ContractType
  onChange: (type: ContractType) => void
  disabled?: boolean
}

const TYPES: { value: ContractType; label: string; description: string }[] = [
  {
    value: 'NDA',
    label: 'NDA',
    description: 'Non-Disclosure Agreement — confidentiality, term, permitted disclosures',
  },
  {
    value: 'MSA',
    label: 'MSA',
    description: 'Master Service Agreement — payment, liability, IP ownership, termination',
  },
]

export function ContractTypeSelector({ value, onChange, disabled }: ContractTypeSelectorProps) {
  return (
    <div className="flex gap-3" role="radiogroup" aria-label="Contract type">
      {TYPES.map((type) => {
        const selected = value === type.value
        return (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(type.value)}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-all disabled:opacity-50 ${
              selected
                ? 'border-primary bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-text-primary'}`}>
              {type.label}
            </p>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{type.description}</p>
          </button>
        )
      })}
    </div>
  )
}
