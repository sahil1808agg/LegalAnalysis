'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Pencil, Check, X, FileText } from 'lucide-react'
import { KeyTerm } from '@/types'
import { ConfidenceBadge } from './ConfidenceBadge'

interface KeyTermRowProps {
  term: KeyTerm
  onPageClick: (page: number) => void
  onTermUpdated: (updated: Pick<KeyTerm, 'id' | 'value' | 'is_edited' | 'original_value'>) => void
}

export function KeyTermRow({ term, onPageClick, onTermUpdated }: KeyTermRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(term.value)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  async function handleSave() {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === term.value) {
      setEditing(false)
      setEditValue(term.value)
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const res = await fetch(`/api/contracts/${term.contract_id}/terms/${term.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error ?? 'Failed to save')
        return
      }

      const { term: updated } = await res.json()
      onTermUpdated(updated)
      setEditing(false)
    } catch {
      setSaveError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditing(false)
    setEditValue(term.value)
    setSaveError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Term name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              {term.term_name}
            </span>
            {term.is_edited && (
              <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 font-medium">
                Edited
              </span>
            )}
            {term.is_custom && (
              <span className="text-xs rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 font-medium">
                Custom
              </span>
            )}
          </div>

          {/* Value or edit input */}
          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input flex-1 text-sm py-1"
                maxLength={1000}
                disabled={saving}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                aria-label="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2 group">
              <p className="text-sm text-text-primary flex-1 leading-relaxed">
                {term.value || <span className="text-gray-400 italic">Not found</span>}
              </p>
              {term.value && (
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 rounded text-gray-400 hover:text-primary hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="Edit term value"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {saveError && (
            <p className="mt-1 text-xs text-red-600">{saveError}</p>
          )}

          {/* Original value when edited */}
          {term.is_edited && term.original_value && (
            <p className="mt-1 text-xs text-text-secondary">
              Original: <span className="line-through">{term.original_value}</span>
            </p>
          )}
        </div>

        {/* Right side: confidence + page + expand */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <ConfidenceBadge score={term.confidence_score} />
          {term.page_number > 0 && (
            <button
              onClick={() => onPageClick(term.page_number)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <FileText className="h-3 w-3" />
              P.{term.page_number}
            </button>
          )}
          {term.source_sentence && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-0.5 text-xs text-text-secondary hover:text-primary"
              aria-label={expanded ? 'Hide source' : 'Show source'}
            >
              Why?
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable source sentence */}
      {expanded && term.source_sentence && (
        <div className="px-4 pb-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-text-secondary leading-relaxed pt-2 italic">
            &ldquo;{term.source_sentence}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
