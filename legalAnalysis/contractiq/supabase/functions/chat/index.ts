import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

const MAX_CHAT_HISTORY = parseInt(Deno.env.get('MAX_CHAT_HISTORY') ?? '100', 10)
const MAX_MESSAGE_LENGTH = 5000

const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|all)\s+instructions?/i,
  /override\s+(your\s+)?rules?/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /print\s+(your\s+)?instructions?/i,
  /expose\s+(env(ironment)?\s+variables?|api\s+keys?)/i,
  /you\s+are\s+now\s+a/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /disregard\s+(your\s+)?(previous\s+)?instructions?/i,
]

function isSafeMessage(message: string): boolean {
  return !INJECTION_PATTERNS.some((p) => p.test(message))
}

const CHAT_SYSTEM_PROMPT = `You are a contract review assistant for ContractIQ.
Answer questions strictly based on the contract document provided below.
If the answer is not in the document, respond: "I cannot find this in the document."
Begin every response with "Based on the document, ..."
Every response must include a page citation in the format [Page X].
Do not use your general legal knowledge to supplement answers.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { contract_id, user_message } = await req.json()

    if (!contract_id || !user_message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user_message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Message exceeds maximum length.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isSafeMessage(user_message)) {
      return new Response(
        JSON.stringify({ error: 'Message contains disallowed content.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('contract_text, status')
      .eq('id', contract_id)
      .eq('user_id', user.id)
      .single()

    if (contractError || !contract) {
      return new Response(
        JSON.stringify({ error: 'Contract not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (contract.status !== 'complete') {
      return new Response(
        JSON.stringify({ error: 'Contract is still being processed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sessionId: string

    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('contract_id', contract_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingSession) {
      sessionId = existingSession.id
    } else {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ contract_id, user_id: user.id })
        .select('id')
        .single()

      if (sessionError || !newSession) {
        return new Response(
          JSON.stringify({ error: 'Database error. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      sessionId = newSession.id
    }

    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(MAX_CHAT_HISTORY)

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: user_message,
    })

    const trimmedHistory = (history ?? []).slice(-MAX_CHAT_HISTORY)
    const messages = [
      { role: 'system' as const, content: CHAT_SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: `[CONTRACT DOCUMENT]\n${contract.contract_text}\n[END CONTRACT DOCUMENT]`,
      },
      ...trimmedHistory.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: user_message },
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 18000)

    let responseContent: string
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        max_tokens: 1000,
        messages,
      })
      clearTimeout(timeout)
      responseContent = completion.choices[0].message.content ?? ''
    } catch (err) {
      clearTimeout(timeout)
      const error = err as { name?: string }
      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Response timed out. Please try again.' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: 'Analysis failed. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: savedMsg, error: saveError } = await supabase
      .from('chat_messages')
      .insert({ session_id: sessionId, role: 'assistant', content: responseContent })
      .select('id, created_at')
      .single()

    if (saveError || !savedMsg) {
      return new Response(
        JSON.stringify({ error: 'Database error. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        messageId: savedMsg.id,
        sessionId,
        role: 'assistant',
        content: responseContent,
        createdAt: savedMsg.created_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('chat error:', err)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
