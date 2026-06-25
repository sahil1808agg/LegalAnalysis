'use client'

import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { Contract } from '@/types'
import { FeedbackWidget } from './FeedbackWidget'

interface ResultsHeaderProps {
  contract: Contract
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing…',
  completed: 'Completed',
  error: 'Error',
}

const STATUS_CLASSES: Record<string, string> = {
  pending: 'status-pending',
  processing: 'status-processing',
  completed: 'status-completed',
  error: 'status-error',
}

export function ResultsHeader({ contract }: ResultsHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-text-primary truncate max-w-[40ch]">
              {contract.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-text-secondary">{contract.contract_type}</span>
              <span className="text-xs text-gray-300">·</span>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_CLASSES[contract.status] ?? ''}`}>
                {STATUS_LABELS[contract.status] ?? contract.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {contract.status === 'completed' && (
        <div className="shrink-0">
          <FeedbackWidget contractId={contract.id} />
        </div>
      )}
    </div>
  )
}
