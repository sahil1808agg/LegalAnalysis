import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient()

  const { data: contract } = await serviceClient
    .from('contracts')
    .select('user_id, status')
    .eq('id', params.id)
    .single()

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (contract.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: terms } = await serviceClient
    .from('key_terms')
    .select('*')
    .eq('contract_id', params.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ terms: terms ?? [] })
}
