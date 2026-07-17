'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/formatDate'
import { DashboardContract, SortOption } from '@/types'
import { cn } from '@/lib/utils/cn'

interface DashboardTableProps {
  contracts: DashboardContract[]
  sort: SortOption
  onSortChange: (s: SortOption) => void
}

function StatusBadge({ status }: { status: DashboardContract['status'] }) {
  if (status === 'complete') return <Badge variant="success">Complete</Badge>
  if (status === 'processing') return (
    <Badge variant="warning">
      <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-yellow-800 border-t-transparent" />
      Processing
    </Badge>
  )
  if (status === 'error') return <Badge variant="error">Error</Badge>
  return <Badge variant="neutral">Pending</Badge>
}

const columns: { label: string; sort?: SortOption }[] = [
  { label: 'Contract Name', sort: 'name_asc' },
  { label: 'Type', sort: 'type' },
  { label: 'Status' },
  { label: 'Pages' },
  { label: 'Date', sort: 'date_desc' },
]

export function DashboardTable({ contracts, sort, onSortChange }: DashboardTableProps) {
  const router = useRouter()

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-grey-100 bg-white py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-grey-50 text-3xl">📄</div>
        <div>
          <p className="font-semibold text-grey-900">No contracts yet</p>
          <p className="mt-1 text-sm text-grey-400">Upload your first contract to begin.</p>
        </div>
        <a
          href="/upload"
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          Review a Contract
        </a>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-grey-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-grey-50 bg-grey-25">
            {columns.map((col) => (
              <th
                key={col.label}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-grey-400',
                  col.sort && 'cursor-pointer select-none hover:text-grey-900'
                )}
                onClick={() => col.sort && onSortChange(col.sort === 'date_desc' && sort === 'date_desc' ? 'date_asc' : (col.sort as SortOption))}
              >
                {col.label}
                {col.sort && (
                  <span className="ml-1 text-grey-200">
                    {sort === col.sort || (col.sort === 'date_asc' && sort === 'date_desc') ? (sort === 'date_asc' ? '↑' : '↓') : '↕'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contracts.map((c, i) => (
            <tr
              key={c.id}
              onClick={() => router.push(`/results/${c.id}`)}
              className={cn(
                'cursor-pointer border-b border-grey-50 last:border-0',
                'hover:bg-grey-25 transition-colors duration-75'
              )}
            >
              <td className="px-4 py-3 font-medium text-grey-900">
                <span className="block max-w-[280px] truncate" title={c.name}>
                  {c.name}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge variant={c.type === 'NDA' ? 'info' : 'neutral'}>{c.type}</Badge>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-grey-500">{c.pageCount}</td>
              <td className="px-4 py-3 text-grey-400">{formatDate(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
