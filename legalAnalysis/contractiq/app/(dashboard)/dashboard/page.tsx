'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { DashboardTable } from '@/components/dashboard/DashboardTable'
import { ErrorBanner } from '@/components/shared/ErrorBanner'
import { useAuth } from '@/hooks/useAuth'
import { DashboardResponse, SortOption } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [sort, setSort] = useState<SortOption>('date_desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (s: SortOption) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard?sort=${s}`)
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error('Failed to load contracts.')
      setData(await res.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!authLoading && !session) router.push('/login')
  }, [authLoading, session, router])

  useEffect(() => {
    if (!authLoading && session) fetchData(sort)
  }, [authLoading, session, sort, fetchData])

  useEffect(() => {
    const onFocus = () => { if (session) fetchData(sort) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [session, sort, fetchData])

  const handleSortChange = (s: SortOption) => {
    setSort(s)
  }

  if (authLoading || (!data && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-grey-25">
      <nav className="flex items-center justify-between border-b border-grey-100 bg-white px-8 py-4">
        <span className="text-lg font-semibold text-grey-900">ContractIQ</span>
        <a
          href="/upload"
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          + Review a Contract
        </a>
      </nav>

      <main className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-grey-900">Dashboard</h1>
          <p className="mt-1 text-sm text-grey-400">Your contract review history</p>
        </div>

        {error && <ErrorBanner message={error} onRetry={() => fetchData(sort)} className="mb-6" />}

        {data && (
          <div className="flex flex-col gap-6">
            <DashboardStats stats={data.stats} />
            <DashboardTable
              contracts={data.contracts}
              sort={sort}
              onSortChange={handleSortChange}
            />
          </div>
        )}
      </main>
    </div>
  )
}
