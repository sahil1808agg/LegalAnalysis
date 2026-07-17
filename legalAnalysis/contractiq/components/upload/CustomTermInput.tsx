'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const MAX_TERMS = 5

interface CustomTermInputProps {
  terms: string[]
  onChange: (terms: string[]) => void
  disabled?: boolean
}

export function CustomTermInput({ terms, onChange, disabled }: CustomTermInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTerm = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || terms.includes(trimmed) || terms.length >= MAX_TERMS) return
    onChange([...terms, trimmed])
    setInputValue('')
  }

  const removeTerm = (term: string) => {
    onChange(terms.filter((t) => t !== term))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTerm() }
  }

  const atLimit = terms.length >= MAX_TERMS

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-grey-900">
        Custom Terms{' '}
        <span className="font-normal text-grey-400">({terms.length}/{MAX_TERMS})</span>
      </p>

      {terms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {terms.map((term) => (
            <span
              key={term}
              className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-500"
            >
              {term}
              <button
                type="button"
                onClick={() => removeTerm(term)}
                disabled={disabled}
                className="text-blue-300 hover:text-blue-500 disabled:cursor-not-allowed"
                aria-label={`Remove ${term}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {atLimit ? (
        <p className="text-xs text-grey-400">Maximum 5 custom terms reached.</p>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Auto-renewal clause"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || atLimit}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={addTerm}
            disabled={disabled || !inputValue.trim() || atLimit}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
