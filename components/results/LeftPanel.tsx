'use client'

import { useState } from 'react'
import { FileText, AlignLeft } from 'lucide-react'
import { Contract, KeyTerm } from '@/types'
import { PdfViewer } from './PdfViewer'
import { TextViewer } from './TextViewer'
import { KeyTermsPanel } from './KeyTermsPanel'

type PanelTab = 'document' | 'terms'

interface LeftPanelProps {
  contract: Contract
  initialTerms: KeyTerm[]
  targetPage: number | null
  onPageClick: (page: number) => void
}

export function LeftPanel({ contract, initialTerms, targetPage, onPageClick }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('document')

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white min-w-0">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 shrink-0">
        <button
          onClick={() => setActiveTab('document')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'document'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText className="h-4 w-4" />
          Document
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'terms'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <AlignLeft className="h-4 w-4" />
          Key Terms
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'document' ? (
          contract.file_path ? (
            <PdfViewer
              contractId={contract.id}
              contractText={contract.contract_text}
              targetPage={targetPage}
              totalPages={contract.page_count}
            />
          ) : (
            <TextViewer text={contract.contract_text} targetPage={targetPage} />
          )
        ) : (
          <div className="h-full overflow-y-auto">
            <KeyTermsPanel
              contractId={contract.id}
              initialStatus={contract.status as 'pending' | 'processing' | 'completed' | 'error'}
              initialTerms={initialTerms}
              onPageClick={onPageClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}
