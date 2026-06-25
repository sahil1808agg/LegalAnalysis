'use client'

import { useState } from 'react'
import { Contract, KeyTerm } from '@/types'
import { ResultsHeader } from '@/components/results/ResultsHeader'
import { LeftPanel } from '@/components/results/LeftPanel'
import { ChatPanel } from '@/components/results/ChatPanel'
import DisclaimerBanner from '@/components/shared/DisclaimerBanner'

interface ResultsPageClientProps {
  contract: Contract
  initialTerms: KeyTerm[]
}

export function ResultsPageClient({ contract, initialTerms }: ResultsPageClientProps) {
  const [targetPage, setTargetPage] = useState<number | null>(null)

  function handlePageClick(page: number) {
    setTargetPage(page)
    // Small timeout so if the user clicks the same page twice the state still updates
    setTimeout(() => setTargetPage(null), 100)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ResultsHeader contract={contract} />

      <div className="shrink-0 border-b border-gray-100">
        <div className="px-6 py-2">
          <DisclaimerBanner />
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — document + key terms (55%) */}
        <div className="w-[55%] flex flex-col overflow-hidden">
          <LeftPanel
            contract={contract}
            initialTerms={initialTerms}
            targetPage={targetPage}
            onPageClick={handlePageClick}
          />
        </div>

        {/* Right — chat (45%) */}
        <div className="w-[45%] flex flex-col overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-text-primary">Ask the document</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Questions are answered using only the uploaded contract text.
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel contractId={contract.id} onPageCite={handlePageClick} />
          </div>
        </div>
      </div>
    </div>
  )
}
