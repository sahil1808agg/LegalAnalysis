'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react'
import { ContractType } from '@/types'
import { ContractTypeSelector } from '@/components/upload/ContractTypeSelector'
import { DropzoneUploader } from '@/components/upload/DropzoneUploader'

interface CustomTermInput {
  id: string
  name: string
}

type UploadStep = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function NewContractPage() {
  const router = useRouter()
  const [contractType, setContractType] = useState<ContractType>('NDA')
  const [file, setFile] = useState<File | null>(null)
  const [customTerms, setCustomTerms] = useState<CustomTermInput[]>([])
  const [newTermName, setNewTermName] = useState('')
  const [step, setStep] = useState<UploadStep>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [contractId, setContractId] = useState<string | null>(null)

  const busy = step === 'uploading' || step === 'processing'

  function addCustomTerm() {
    const trimmed = newTermName.trim()
    if (!trimmed || customTerms.length >= 5) return
    setCustomTerms((prev) => [...prev, { id: crypto.randomUUID(), name: trimmed }])
    setNewTermName('')
  }

  function removeCustomTerm(id: string) {
    setCustomTerms((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setUploadError(null)
    setStep('uploading')

    try {
      // Step 1 — Upload PDF and extract text
      const formData = new FormData()
      formData.append('file', file)
      formData.append('contract_type', contractType)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        setUploadError(uploadData.error ?? 'Upload failed. Please try again.')
        setStep('error')
        return
      }

      const newContractId: string = uploadData.contract_id
      setContractId(newContractId)
      setStep('processing')

      // Step 2 — Add custom terms (fire-and-forget order; max 5 enforced server-side)
      if (customTerms.length > 0) {
        await Promise.all(
          customTerms.map((t) =>
            fetch(`/api/contracts/${newContractId}/custom-terms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ term_name: t.name }),
            })
          )
        )
      }

      // Step 3 — Trigger OpenAI extraction
      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: newContractId }),
      })

      if (!processRes.ok) {
        const processData = await processRes.json()
        setUploadError(processData.error ?? 'Processing failed. Please try again.')
        setStep('error')
        return
      }

      setStep('done')
      router.push(`/contracts/${newContractId}`)
    } catch {
      setUploadError('A network error occurred. Please try again.')
      setStep('error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Review a Contract</h1>
        <p className="text-sm text-text-secondary mt-1">
          Upload an NDA or MSA to extract key terms with AI — results in under 30 seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contract type */}
        <section>
          <h2 className="label mb-3">1. Contract type</h2>
          <ContractTypeSelector value={contractType} onChange={setContractType} disabled={busy} />
        </section>

        {/* PDF upload */}
        <section>
          <h2 className="label mb-3">2. Upload PDF</h2>
          <DropzoneUploader
            onFileSelect={setFile}
            selectedFile={file}
            onClear={() => setFile(null)}
            disabled={busy}
            error={uploadError}
          />
        </section>

        {/* Custom terms */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="label">3. Custom terms <span className="text-text-secondary font-normal">(optional)</span></h2>
            <span className="text-xs text-text-secondary">{customTerms.length}/5</span>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            Ask the AI to look for specific clauses or terms beyond the standard set.
          </p>

          {customTerms.length > 0 && (
            <ul className="space-y-2 mb-3">
              {customTerms.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-sm text-text-primary">{t.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomTerm(t.id)}
                    disabled={busy}
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-40"
                    aria-label={`Remove ${t.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {customTerms.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTermName}
                onChange={(e) => setNewTermName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTerm() } }}
                placeholder="e.g. Arbitration Clause"
                className="input flex-1 text-sm"
                maxLength={100}
                disabled={busy}
              />
              <button
                type="button"
                onClick={addCustomTerm}
                disabled={!newTermName.trim() || busy}
                className="btn-secondary text-sm px-3 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Status messages */}
        {step === 'uploading' && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Uploading and extracting text…
          </div>
        )}
        {step === 'processing' && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Analysing contract with AI… (15–30 seconds)
          </div>
        )}
        {step === 'error' && uploadError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!file || busy}
          className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-50"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </span>
          ) : (
            'Analyse Contract'
          )}
        </button>
      </form>
    </div>
  )
}
