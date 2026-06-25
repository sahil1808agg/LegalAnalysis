import { createClient } from '@/lib/supabase/server'
import EmptyState from '@/components/shared/EmptyState'
import { type ContractSummary } from '@/types'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'

export const metadata = { title: 'Dashboard — ContractIQ' }

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, title, contract_type, status, created_at')
    .order('created_at', { ascending: false })

  const rows = (contracts ?? []) as ContractSummary[]
  const ndaCount = rows.filter((c) => c.contract_type === 'NDA').length
  const msaCount = rows.filter((c) => c.contract_type === 'MSA').length

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">Your contract review history</p>
        </div>
        <Link href="/contracts/new" className="btn-primary">
          <Plus size={16} strokeWidth={2} />
          Review a Contract
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No contracts reviewed yet"
          description="Upload your first NDA or MSA to get started. ContractIQ will extract the key terms in under 30 seconds."
          ctaLabel="Review a Contract"
          ctaHref="/contracts/new"
        />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <SummaryCard label="Total Contracts" value={rows.length} />
            <SummaryCard label="NDAs" value={ndaCount} />
            <SummaryCard label="MSAs" value={msaCount} />
          </div>

          {/* Contracts table */}
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-subtle">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Contract
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((contract) => (
                  <ContractRow key={contract.id} contract={contract} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <span className="text-3xl font-bold text-text-primary">{value}</span>
    </div>
  )
}

function ContractRow({ contract }: { contract: ContractSummary }) {
  const statusClass: Record<string, string> = {
    completed: 'status-completed',
    processing: 'status-processing',
    pending: 'status-pending',
    error: 'status-error',
  }

  const typeClass = contract.contract_type === 'NDA'
    ? 'bg-indigo-100 text-indigo-700'
    : 'bg-purple-100 text-purple-700'

  return (
    <Link href={`/contracts/${contract.id}`} className="contents">
      <tr className="border-b border-border last:border-0 hover:bg-background-subtle cursor-pointer transition-colors">
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-text-muted flex-shrink-0" strokeWidth={1.5} />
            <span className="font-medium text-text-primary truncate max-w-xs">{contract.title}</span>
          </div>
        </td>
        <td className="px-5 py-3.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeClass}`}>
            {contract.contract_type}
          </span>
        </td>
        <td className="px-5 py-3.5 text-text-secondary">
          {new Date(contract.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </td>
        <td className="px-5 py-3.5">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusClass[contract.status] ?? 'status-pending'}`}
          >
            {contract.status}
          </span>
        </td>
      </tr>
    </Link>
  )
}
