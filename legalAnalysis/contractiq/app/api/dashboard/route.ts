import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DashboardContract, SortOption } from '@/types'

const SORT_MAP: Record<SortOption, string> = {
  date_desc: 'created_at',
  date_asc: 'created_at',
  name_asc: 'name',
  type: 'type',
}

const SORT_ASC: Record<SortOption, boolean> = {
  date_desc: false,
  date_asc: true,
  name_asc: true,
  type: true,
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sort = (searchParams.get('sort') ?? 'date_desc') as SortOption
  const column = SORT_MAP[sort] ?? 'created_at'
  const ascending = SORT_ASC[sort] ?? false

  const { data, error } = await supabase
    .from('contracts')
    .select('id, name, type, status, page_count, created_at')
    .eq('user_id', session.user.id)
    .order(column, { ascending })

  if (error) return NextResponse.json({ error: 'Failed to fetch contracts.' }, { status: 500 })

  const contracts: DashboardContract[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    pageCount: c.page_count,
    createdAt: c.created_at,
  }))

  return NextResponse.json({
    stats: {
      total: contracts.length,
      byType: {
        NDA: contracts.filter((c) => c.type === 'NDA').length,
        MSA: contracts.filter((c) => c.type === 'MSA').length,
      },
    },
    contracts,
  })
}
