import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { FeedbackSchema } from '@/lib/validation/schemas'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = FeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { contract_id, rating, comment } = parsed.data
  const serviceClient = createServiceClient()

  const { data: contract } = await serviceClient
    .from('contracts')
    .select('id, user_id')
    .eq('id', contract_id)
    .single()

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (contract.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: feedback, error: insertError } = await serviceClient
    .from('user_feedback')
    .insert({ user_id: user.id, contract_id, rating, comment: comment ?? null })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'You have already submitted feedback for this contract.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  return NextResponse.json({ feedback_id: feedback.id }, { status: 201 })
}
