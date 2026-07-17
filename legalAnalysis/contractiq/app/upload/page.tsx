'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ContractTypeSelector } from '@/components/upload/ContractTypeSelector'
import { PDFUploader } from '@/components/upload/PDFUploader'
import { KeyTermPreview } from '@/components/upload/KeyTermPreview'
import { CustomTermInput } from '@/components/upload/CustomTermInput'
import { ProcessButton } from '@/components/upload/ProcessButton'
import { ProcessingProgress } from '@/components/shared/ProcessingProgress'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { ContractType } from '@/types'

type Stage = 'idle' | 'uploading' | 'extracting' | 'processing' | 'done' | 'error'

const MAX_POLL_ATTEMPTS = 30

export default function UploadPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()

  const [contractType, setContractType] = useState<ContractType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [customTerms, setCustomTerms] = useState<string[]>([])
  const [stage, setStage] = useState<Stage>('idle')
  const [contractId, setContractId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pollAttemptsRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!authLoading && !session) router.push('/login')
  }, [authLoading, session, router])

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  const pollStatus = useCallback(
    async (id: string) => {
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setStage('error')
        setErrorMessage('Analysis is taking longer than expected. Please try again.')
        return
      }

      pollAttemptsRef.current += 1

      try {
        const res = await fetch(`/api/contracts/${id}`)
        if (!res.ok) throw new Error('Failed to check status.')
        const data = await res.json()

        if (data.status === 'complete') {
          setStage('done')
          router.push(`/results/${id}`)
          return
        }

        if (data.status === 'error') {
          setStage('error')
          setErrorMessage('Analysis failed. Please try again.')
          return
        }

        pollTimerRef.current = setTimeout(() => pollStatus(id), 2000)
      } catch {
        setStage('error')
        setErrorMessage('Failed to check analysis status. Please try again.')
      }
    },
    [router]
  )

  const startProcess = useCallback(
    async (id: string) => {
      setStage('processing')
      try {
        const res = await fetch(`/api/contracts/${id}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customTerms }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to start processing.')
        }

        pollAttemptsRef.current = 0
        pollTimerRef.current = setTimeout(() => pollStatus(id), 2000)
      } catch (e) {
        setStage('error')
        setErrorMessage((e as Error).message)
      }
    },
    [customTerms, pollStatus]
  )

  const handleSubmit = async () => {
    if (!file || !contractType) return

    setErrorMessage(null)
    setStage('uploading')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('contractType', contractType)
      formData.append('contractName', file.name.replace(/\.pdf$/i, ''))

      const res = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed. Please try again.')
      }

      setContractId(data.contractId)
      setStage('extracting')

      await startProcess(data.contractId)
    } catch (e) {
      setStage('error')
      setErrorMessage((e as Error).message)
    }
  }

  const handleRetry = () => {
    if (!contractId) return
    setErrorMessage(null)
    pollAttemptsRef.current = 0
    startProcess(contractId)
  }

  const isProcessing = stage === 'uploading' || stage === 'extracting' || stage === 'processing' || stage === 'done'
  const canSubmit = !!file && !!contractType && stage === 'idle'

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-grey-25">
      <nav className="flex items-center justify-between border-b border-grey-100 bg-white px-8 py-4">
        <a href="/dashboard" className="text-lg font-semibold text-grey-900">
          ContractIQ
        </a>
        <a href="/dashboard" className="text-sm text-grey-400 hover:text-grey-900">
          ← Back to Dashboard
        </a>
      </nav>

      <main className="mx-auto max-w-2xl px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-grey-900">Review a Contract</h1>
          <p className="mt-1 text-sm text-grey-400">
            Upload a PDF and we'll extract the key terms for you.
          </p>
        </div>

        {stage === 'error' && errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={contractId ? handleRetry : undefined}
            className="mb-6"
          />
        )}

        {isProcessing && stage !== 'done' ? (
          <div className="rounded-xl border border-grey-100 bg-white p-8">
            <ProcessingProgress
              stage={stage === 'uploading' || stage === 'extracting' ? 'extracting' : 'processing'}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6 rounded-xl border border-grey-100 bg-white p-8">
            <ContractTypeSelector
              value={contractType}
              onChange={setContractType}
              disabled={isProcessing}
            />

            <PDFUploader
              onFileSelect={setFile}
              selectedFile={file}
              disabled={isProcessing}
            />

            {contractType && (
              <>
                <CustomTermInput
                  terms={customTerms}
                  onChange={setCustomTerms}
                  disabled={isProcessing}
                />

                <KeyTermPreview
                  contractType={contractType}
                  customTerms={customTerms}
                />
              </>
            )}

            <ProcessButton
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={isProcessing}
            />
          </div>
        )}
      </main>
    </div>
  )
}
