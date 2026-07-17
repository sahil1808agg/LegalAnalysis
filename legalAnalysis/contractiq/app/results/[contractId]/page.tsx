'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { KeyTermsPanel } from '@/components/results/KeyTermsPanel'
import { PDFViewer } from '@/components/results/PDFViewer'
import { TextViewerFallback } from '@/components/results/TextViewerFallback'
import { DisclaimerBanner } from '@/components/shared/DisclaimerBanner'
import { FeedbackWidget } from '@/components/shared/FeedbackWidget'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { ProcessingProgress } from '@/components/shared/ProcessingProgress'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ContractResponse, KeyTerm } from '@/types'

const POLL_INTERVAL = 2000
const MAX_POLL_ATTEMPTS = 30

export default function ResultsPage() {
  const router = useRouter()
  const params = useParams<{ contractId: string }>()
  const contractId = params.contractId
  const { session, loading: authLoading } = useAuth()

  const [contract, setContract] = useState<ContractResponse | null>(null)
  const [keyTerms, setKeyTerms] = useState<KeyTerm[]>([])
  const [targetPage, setTargetPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'viewer' | 'chat'>('viewer')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const pollAttemptsRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!authLoading && !session) router.push('/login')
  }, [authLoading, session, router])

  const fetchContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}`)
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 403 || res.status === 404) { router.push('/dashboard'); return }
      if (!res.ok) throw new Error('Failed to load contract.')

      const data: ContractResponse = await res.json()
      setContract(data)
      setKeyTerms(data.keyTerms ?? [])
      return data
    } catch (e) {
      setError((e as Error).message)
      return null
    }
  }, [contractId, router])

  const startPolling = useCallback(
    async (id: string) => {
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setError('Analysis is taking longer than expected. Please refresh the page.')
        setPolling(false)
        return
      }

      pollAttemptsRef.current += 1

      const data = await fetchContract()
      if (!data) { setPolling(false); return }

      if (data.status === 'complete') {
        setPolling(false)
        return
      }

      if (data.status === 'error') {
        setError('Analysis failed. Please try again.')
        setPolling(false)
        return
      }

      pollTimerRef.current = setTimeout(() => startPolling(id), POLL_INTERVAL)
    },
    [fetchContract]
  )

  useEffect(() => {
    if (authLoading || !session) return

    const init = async () => {
      setLoading(true)
      const data = await fetchContract()
      setLoading(false)

      if (data && (data.status === 'pending' || data.status === 'processing')) {
        setPolling(true)
        pollAttemptsRef.current = 0
        pollTimerRef.current = setTimeout(() => startPolling(contractId), POLL_INTERVAL)
      }
    }

    init()

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [authLoading, session, contractId, fetchContract, startPolling])

  const handleTermUpdate = async (termId: string, newValue: string) => {
    const res = await fetch(`/api/contracts/${contractId}/terms/${termId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to update term.')
    }

    const updated = await res.json()
    setKeyTerms((prev) =>
      prev.map((t) =>
        t.id === termId
          ? { ...t, value: updated.value, isEdited: updated.isEdited, originalAiValue: updated.originalAiValue }
          : t
      )
    )
  }

  const handleRetry = () => {
    if (!contractId) return
    setError(null)
    pollAttemptsRef.current = 0
    setPolling(true)
    fetch(`/api/contracts/${contractId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customTerms: [] }),
    }).then(() => {
      pollTimerRef.current = setTimeout(() => startPolling(contractId), POLL_INTERVAL)
    }).catch(() => {
      setError('Failed to retry. Please try again.')
      setPolling(false)
    })
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  const isProcessing = polling || contract?.status === 'pending' || contract?.status === 'processing'

  return (
    <div className="flex min-h-screen flex-col">
      <DisclaimerBanner />

      <nav className="flex items-center justify-between border-b border-grey-100 bg-white px-8 py-4">
        <a href="/dashboard" className="text-lg font-semibold text-grey-900">
          ContractIQ
        </a>
        <a href="/dashboard" className="text-sm text-grey-400 hover:text-grey-900">
          ← Dashboard
        </a>
      </nav>

      {error && !isProcessing && (
        <div className="px-8 pt-6">
          <ErrorBanner
            message={error}
            onRetry={contract?.status === 'error' ? handleRetry : undefined}
          />
        </div>
      )}

      {isProcessing ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm rounded-xl border border-grey-100 bg-white p-8">
            <h2 className="mb-6 text-center text-base font-semibold text-grey-900">
              Analysing your contract…
            </h2>
            <ProcessingProgress stage="processing" />
          </div>
        </div>
      ) : contract ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden border-r border-grey-100">
            <div className="flex border-b border-grey-100">
              <button
                type="button"
                onClick={() => setActiveTab('viewer')}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'viewer'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-grey-400 hover:text-grey-600'
                }`}
              >
                Document
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-grey-400 hover:text-grey-600'
                }`}
              >
                Chat
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === 'viewer' ? (
                contract.signedUrl ? (
                  <PDFViewer
                    signedUrl={contract.signedUrl}
                    targetPage={targetPage}
                    totalPages={contract.pageCount}
                  />
                ) : (
                  <TextViewerFallback
                    contractText={contract.contractText ?? ''}
                    targetPage={targetPage}
                  />
                )
              ) : (
                <ChatInterface
                  contractId={contractId}
                  onPageSelect={(page) => { setTargetPage(page); setActiveTab('viewer') }}
                />
              )}
            </div>
          </div>

          <div className="w-96 shrink-0 overflow-y-auto p-6">
            <div className="mb-4">
              <h1 className="text-lg font-bold text-grey-900">{contract.name}</h1>
              <p className="text-xs text-grey-400">
                {contract.type} · {contract.pageCount} pages · {keyTerms.length} terms extracted
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <KeyTermsPanel
                terms={keyTerms}
                onPageSelect={setTargetPage}
                onTermUpdate={handleTermUpdate}
              />
              <FeedbackWidget contractId={contractId} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
