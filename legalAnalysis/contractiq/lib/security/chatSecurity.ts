import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type OwnershipOk = { ok: true }
type OwnershipFail = { ok: false; response: NextResponse }
type OwnershipResult = OwnershipOk | OwnershipFail

export async function verifyContractOwnership(
  contractId: string,
  userId: string
): Promise<OwnershipResult & { status?: string }> {
  const supabase = createClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select('user_id, status')
    .eq('id', contractId)
    .single()

  if (!contract || contract.user_id !== userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
    }
  }

  return { ok: true, status: contract.status }
}

export async function verifySessionOwnership(
  sessionId: string,
  userId: string
): Promise<OwnershipResult> {
  const supabase = createClient()

  const { data: chatSession } = await supabase
    .from('chat_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  if (!chatSession || chatSession.user_id !== userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
    }
  }

  return { ok: true }
}
