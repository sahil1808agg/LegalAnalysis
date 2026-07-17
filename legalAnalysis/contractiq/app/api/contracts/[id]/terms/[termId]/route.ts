import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; termId: string } }
) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { value?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const newValue = typeof body.value === 'string' ? body.value.trim() : ''
  if (!newValue) {
    return NextResponse.json({ error: 'Value cannot be empty.' }, { status: 400 })
  }

  const { data: term, error: fetchError } = await supabase
    .from('key_terms')
    .select('id, user_id, value, is_edited, original_ai_value')
    .eq('id', params.termId)
    .eq('contract_id', params.id)
    .single()

  if (fetchError || !term) {
    return NextResponse.json({ error: 'Term not found.' }, { status: 404 })
  }

  if (term.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const originalAiValue = term.is_edited ? term.original_ai_value : term.value

  const { data: updated, error: updateError } = await supabase
    .from('key_terms')
    .update({
      value: newValue,
      original_ai_value: originalAiValue,
      is_edited: true,
    })
    .eq('id', params.termId)
    .select('id, value, is_edited, original_ai_value')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Failed to update term.' }, { status: 500 })
  }

  return NextResponse.json({
    id: updated.id,
    value: updated.value,
    isEdited: updated.is_edited,
    originalAiValue: updated.original_ai_value,
  })
}
