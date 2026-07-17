import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { rating?: unknown; comment?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rating = body.rating
  if (rating !== 'up' && rating !== 'down') {
    return NextResponse.json({ error: 'Rating must be "up" or "down".' }, { status: 400 })
  }

  const comment = typeof body.comment === 'string' ? body.comment.trim() : null

  const { data, error } = await supabase
    .from('user_feedback')
    .insert({
      contract_id: params.id,
      user_id: session.user.id,
      rating,
      comment: comment || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Feedback already submitted for this contract.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to submit feedback.' }, { status: 500 })
  }

  return NextResponse.json({ feedbackId: data.id }, { status: 201 })
}
