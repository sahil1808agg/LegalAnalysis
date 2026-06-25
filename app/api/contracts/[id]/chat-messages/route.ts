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
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!contract || contract.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: session } = await serviceClient
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', params.id)
    .single()

  if (!session) {
    return NextResponse.json({ messages: [] })
  }

  const { data: messages } = await serviceClient
    .from('chat_messages')
    .select('id, session_id, user_id, role, content, page_citation, created_at')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ messages: messages ?? [] })
}
