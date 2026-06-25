import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { answerWithMemory } from '@/lib/openai/chat'
import { ChatSchema } from '@/lib/validation/schemas'
import { type ConversationTurn } from '@/lib/memory/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = ChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const { contract_id, message } = parsed.data
  const serviceClient = createServiceClient()

  const { data: contract } = await serviceClient
    .from('contracts')
    .select('id, user_id, contract_text, status')
    .eq('id', contract_id)
    .single()

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (contract.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (contract.status !== 'completed') {
    return NextResponse.json(
      { error: 'Contract must be fully processed before chatting.' },
      { status: 409 }
    )
  }

  // ── Get or create the persistent chat session ────────────────────────────
  let sessionId: string

  const { data: existingSession } = await serviceClient
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', contract_id)
    .single()

  if (existingSession) {
    sessionId = existingSession.id
  } else {
    const { data: newSession, error: sessionError } = await serviceClient
      .from('chat_sessions')
      .insert({ contract_id, user_id: user.id })
      .select('id')
      .single()

    if (sessionError || !newSession) {
      return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 })
    }
    sessionId = newSession.id
  }

  // ── Load full conversation history (before saving the new message) ────────
  const { data: historyRows } = await serviceClient
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const history: ConversationTurn[] = (historyRows ?? []).map((row) => ({
    role: row.role as 'user' | 'assistant',
    content: row.content,
  }))

  // ── Persist the incoming user message ────────────────────────────────────
  const { data: userMsg, error: userMsgError } = await serviceClient
    .from('chat_messages')
    .insert({ session_id: sessionId, user_id: user.id, role: 'user', content: message })
    .select('id, session_id, user_id, role, content, page_citation, created_at')
    .single()

  if (userMsgError || !userMsg) {
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  // ── Classify + retrieve context + call OpenAI ─────────────────────────────
  let result
  try {
    result = await answerWithMemory(contract.contract_text, history, message)
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'AI response failed. Please try again.'
    return NextResponse.json({ error: errMessage }, { status: 500 })
  }

  // ── Persist the assistant response ───────────────────────────────────────
  const { data: assistantMsg } = await serviceClient
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'assistant',
      content: result.content,
      page_citation: result.pageCitation,
    })
    .select('id, session_id, user_id, role, content, page_citation, created_at')
    .single()

  // ── Keep session timestamp fresh ──────────────────────────────────────────
  await serviceClient
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Return the assistant message + context_type for source attribution in the UI
  return NextResponse.json(
    { message: assistantMsg, context_type: result.contextType },
    { status: 200 }
  )
}
