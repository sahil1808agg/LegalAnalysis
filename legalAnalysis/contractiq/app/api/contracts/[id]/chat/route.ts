import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/security/rateLimiter'
import { sanitizeForLLM } from '@/lib/security/promptInjectionGuard'
import { ChatMessageSchema } from '@/lib/security/inputValidator'
import { buildChatMessages } from '@/lib/openai/chatPrompt'
import { classifyContext } from '@/lib/openai/classifyContext'
import { openai } from '@/lib/openai/client'
import { MAX_CHAT_HISTORY } from '@/lib/security/tokenLimiter'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const supabase = createClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!contract || contract.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const { data: chatSession } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', params.id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!chatSession) {
    return NextResponse.json({ sessionId: null, messages: [] })
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at, context_type')
    .eq('session_id', chatSession.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    sessionId: chatSession.id,
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
      contextType: m.context_type ?? undefined,
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const rateCheck = await checkRateLimit({
    action: 'chat',
    userId: auth.user.id,
    ...RATE_LIMITS.CHAT,
  })
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const validation = ChatMessageSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Message is required and must be under 5000 characters.' }, { status: 422 })
  }

  const message = validation.data.message

  const injectionCheck = sanitizeForLLM(message)
  if (!injectionCheck.safe) {
    return NextResponse.json({ error: 'Message contains disallowed content.' }, { status: 400 })
  }

  const supabase = createClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select('user_id, contract_text, status')
    .eq('id', params.id)
    .single()

  if (!contract || contract.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  if (contract.status !== 'complete') {
    return NextResponse.json({ error: 'Contract is still being processed.' }, { status: 400 })
  }

  const { data: chatSession, error: sessionError } = await supabase
    .from('chat_sessions')
    .upsert(
      { contract_id: params.id, user_id: auth.user.id },
      { onConflict: 'contract_id,user_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (sessionError || !chatSession) {
    return NextResponse.json({ error: 'Failed to create chat session.' }, { status: 500 })
  }

  const { data: historyRows } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', chatSession.id)
    .order('created_at', { ascending: true })
    .limit(MAX_CHAT_HISTORY)

  const history = (historyRows ?? []).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const contextType = classifyContext(message, history)

  const { data: userMsg, error: userMsgError } = await supabase
    .from('chat_messages')
    .insert({ session_id: chatSession.id, role: 'user', content: message })
    .select('id, created_at')
    .single()

  if (userMsgError || !userMsg) {
    return NextResponse.json({ error: 'Failed to save message.' }, { status: 500 })
  }

  let assistantContent: string
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 1000,
      messages: buildChatMessages(contract.contract_text as string, history, message, contextType),
    })
    assistantContent = completion.choices[0]?.message?.content ?? ''
  } catch {
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }

  if (!assistantContent) {
    return NextResponse.json({ error: 'No response from AI. Please try again.' }, { status: 500 })
  }

  const { data: assistantMsg, error: assistantMsgError } = await supabase
    .from('chat_messages')
    .insert({
      session_id: chatSession.id,
      role: 'assistant',
      content: assistantContent,
      context_type: contextType,
    })
    .select('id, created_at')
    .single()

  if (assistantMsgError || !assistantMsg) {
    return NextResponse.json({ error: 'Failed to save assistant response.' }, { status: 500 })
  }

  return NextResponse.json({
    userMessage: { id: userMsg.id, role: 'user', content: message, createdAt: userMsg.created_at },
    assistantMessage: {
      id: assistantMsg.id,
      role: 'assistant',
      content: assistantContent,
      createdAt: assistantMsg.created_at,
      contextType,
    },
  })
}
