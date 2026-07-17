'use client'

import { useState } from 'react'
import { KeyTerm } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfidenceBadge } from './ConfidenceBadge'
import { SourceSentenceTooltip } from './SourceSentenceTooltip'

interface TermCardProps {
  term: KeyTerm
  onPageSelect: (page: number) => void
  onUpdate: (termId: string, newValue: string) => Promise<void>
}

const MAX_VALUE_LENGTH = 200

export function TermCard({ term, onPageSelect, onUpdate }: TermCardProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(term.value)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const displayValue = term.value.length > MAX_VALUE_LENGTH && !expanded
    ? term.value.slice(0, MAX_VALUE_LENGTH) + '…'
    : term.value
  const needsExpand = term.value.length > MAX_VALUE_LENGTH

  const handleSave = async () => {
    if (!editValue.trim()) return
    setSaving(true)
    try {
      await onUpdate(term.id, editValue.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(term.value)
    setEditing(false)
  }

  return (
    <div className="rounded-lg border border-grey-100 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-grey-900">{term.termName}</span>
          {term.isCustom && <Badge variant="info">Custom</Badge>}
          {term.isEdited && (
            <span title={`AI extracted: ${term.originalAiValue}`}>
              <Badge variant="info">Edited</Badge>
            </span>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={saving}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!editValue.trim() || saving}
              loading={saving}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-grey-900">{displayValue}</p>
          {needsExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs text-blue-500 hover:underline"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => onPageSelect(term.pageNumber)}
          className="text-xs text-blue-500 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
        >
          Page {term.pageNumber}
        </button>
        <ConfidenceBadge score={term.confidenceScore} />
        {!editing && (
          <button
            type="button"
            onClick={() => { setEditValue(term.value); setEditing(true) }}
            className="ml-auto text-xs text-grey-400 hover:text-grey-600 underline-offset-2 hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      <SourceSentenceTooltip sourceSentence={term.sourceSentence} />
    </div>
  )
}
