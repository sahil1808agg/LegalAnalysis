import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PatchTermSchema } from '@/lib/validation/schemas'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; termId: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = PatchTermSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'value is required (1–1000 characters)' }, { status: 400 })
  }

  const { value: newValue } = parsed.data
  const serviceClient = createServiceClient()

  const { data: term } = await serviceClient
    .from('key_terms')
    .select('id, user_id, contract_id, value, original_value, is_edited')
    .eq('id', params.termId)
    .eq('contract_id', params.id)
    .single()

  if (!term) {
    return NextResponse.json({ error: 'Term not found' }, { status: 404 })
  }

  if (term.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const oldValue = term.value
  const originalValue = term.is_edited ? term.original_value : oldValue

  const { data: updated, error: updateError } = await serviceClient
    .from('key_terms')
    .update({ value: newValue, is_edited: true, original_value: originalValue })
    .eq('id', params.termId)
    .select('id, value, is_edited, original_value')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Failed to update term' }, { status: 500 })
  }

  // Write audit record
  await serviceClient.from('term_corrections').insert({
    key_term_id: params.termId,
    user_id: user.id,
    contract_id: params.id,
    old_value: oldValue,
    new_value: newValue,
  })

  return NextResponse.json({ term: updated })
}
