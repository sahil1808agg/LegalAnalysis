'use client'

import { useState, useEffect, useCallback } from 'react'
import { KeyTerm } from '@/types'
import { KeyTermRow } from './KeyTermRow'
import { ProcessingIndicator } from './ProcessingIndicator'
import { useContractStatus } from '@/hooks/useContractStatus'
import { Loader2 } from 'lucide-react'

type ContractStatus = 'pending' | 'processing' | 'completed' | 'error'

interface KeyTermsPanelProps {
  contractId: string
  initialStatus: ContractStatus
  initialTerms: KeyTerm[]
  onPageClick: (page: number) => void
}

export function KeyTermsPanel({
  contractId,
  initialStatus,
  initialTerms,
  onPageClick,
}: KeyTermsPanelProps) {
  const { status, errorMessage } = useContractStatus(contractId, initialStatus)
  const [terms, setTerms] = useState<KeyTerm[]>(initialTerms)
  const [loadingTerms, setLoadingTerms] = useState(false)

  const fetchTerms = useCallback(async () => {
    setLoadingTerms(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/key-terms`)
      if (res.ok) {
        const data = await res.json()
        setTerms(data.terms ?? [])
      }
    } finally {
      setLoadingTerms(false)
    }
  }, [contractId])

  // Fetch terms once processing completes
  useEffect(() => {
    if (status === 'completed' && initialStatus !== 'completed') {
      fetchTerms()
    }
  }, [status, initialStatus, fetchTerms])

  function handleTermUpdated(updated: Pick<KeyTerm, 'id' | 'value' | 'is_edited' | 'original_value'>) {
    setTerms((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
    )
  }

  if (status !== 'completed') {
    return (
      <ProcessingIndicator
        status={status as 'pending' | 'processing' | 'error'}
        errorMessage={errorMessage}
      />
    )
  }

  if (loadingTerms) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    )
  }

  if (terms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <p className="text-sm text-text-secondary">No key terms were extracted from this contract.</p>
      </div>
    )
  }

  const ndaTerms = terms.filter((t) => !t.is_custom)
  const customTerms = terms.filter((t) => t.is_custom)

  return (
    <div className="flex flex-col gap-3 py-4 px-4">
      {ndaTerms.map((term) => (
        <KeyTermRow
          key={term.id}
          term={term}
          onPageClick={onPageClick}
          onTermUpdated={handleTermUpdated}
        />
      ))}

      {customTerms.length > 0 && (
        <>
          <div className="mt-2 mb-1">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Custom Terms
            </span>
          </div>
          {customTerms.map((term) => (
            <KeyTermRow
              key={term.id}
              term={term}
              onPageClick={onPageClick}
              onTermUpdated={handleTermUpdated}
            />
          ))}
        </>
      )}
    </div>
  )
}
