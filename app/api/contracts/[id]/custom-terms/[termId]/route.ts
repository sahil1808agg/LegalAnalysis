import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; termId: string } }
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

  if (contract.status !== 'pending') {
    return NextResponse.json(
      { error: 'Custom terms cannot be removed after processing has started.' },
      { status: 409 }
    )
  }

  const { error: deleteError } = await serviceClient
    .from('key_terms')
    .delete()
    .eq('id', params.termId)
    .eq('contract_id', params.id)
    .eq('user_id', user.id)
    .eq('is_custom', true)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to remove term' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
