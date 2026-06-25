import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AddCustomTermSchema } from '@/lib/validation/schemas'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = AddCustomTermSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'term_name is required (max 100 characters)' }, { status: 400 })
  }

  const { term_name } = parsed.data
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

  if (contract.status !== 'pending') {
    return NextResponse.json(
      { error: 'Custom terms can only be added before processing.' },
      { status: 409 }
    )
  }

  // Enforce max 5 custom terms
  const { count } = await serviceClient
    .from('key_terms')
    .select('id', { count: 'exact', head: true })
    .eq('contract_id', params.id)
    .eq('is_custom', true)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Maximum of 5 custom terms reached.' }, { status: 400 })
  }

  const { data: term, error: insertError } = await serviceClient
    .from('key_terms')
    .insert({
      contract_id: params.id,
      user_id: user.id,
      term_name,
      value: '',
      page_number: 0,
      confidence_score: 0,
      is_custom: true,
    })
    .select('id, term_name, is_custom')
    .single()

  if (insertError || !term) {
    return NextResponse.json({ error: 'Failed to add custom term' }, { status: 500 })
  }

  return NextResponse.json({ term }, { status: 201 })
}
