import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { extractKeyTerms } from '@/lib/openai/extract'
import { exceedsTokenLimit } from '@/lib/utils/tokens'
import { ProcessSchema } from '@/lib/validation/schemas'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = ProcessSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { contract_id } = parsed.data
  const serviceClient = createServiceClient()

  const { data: contract, error: fetchError } = await serviceClient
    .from('contracts')
    .select('id, user_id, contract_text, contract_type, status')
    .eq('id', contract_id)
    .single()

  if (fetchError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (contract.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (contract.status !== 'pending') {
    return NextResponse.json(
      { error: 'Contract has already been processed or is currently processing.' },
      { status: 409 }
    )
  }

  if (exceedsTokenLimit(contract.contract_text)) {
    return NextResponse.json(
      {
        error:
          'This contract exceeds the maximum supported length (approximately 20 pages). Longer contract support is coming soon.',
      },
      { status: 422 }
    )
  }

  // Mark as processing
  await serviceClient
    .from('contracts')
    .update({ status: 'processing' })
    .eq('id', contract_id)

  // Fetch any custom terms already added
  const { data: customTermRows } = await serviceClient
    .from('key_terms')
    .select('term_name')
    .eq('contract_id', contract_id)
    .eq('is_custom', true)

  const customTermNames = (customTermRows ?? []).map((r: { term_name: string }) => r.term_name)

  try {
    const terms = await extractKeyTerms(
      contract.contract_text,
      contract.contract_type as 'NDA' | 'MSA',
      customTermNames
    )

    const termRows = terms.map((t) => ({
      contract_id,
      user_id: user.id,
      term_name: t.term_name,
      value: t.value,
      page_number: t.page_number,
      confidence_score: t.confidence_score,
      source_sentence: t.source_sentence,
      is_custom: customTermNames.includes(t.term_name),
      is_edited: false,
    }))

    // Delete any placeholder custom term rows (value='') before inserting full results
    await serviceClient
      .from('key_terms')
      .delete()
      .eq('contract_id', contract_id)
      .eq('value', '')

    await serviceClient.from('key_terms').insert(termRows)

    await serviceClient
      .from('contracts')
      .update({ status: 'completed' })
      .eq('id', contract_id)

    return NextResponse.json({ status: 'completed' }, { status: 200 })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'AI extraction failed. Please try again.'

    await serviceClient
      .from('contracts')
      .update({ status: 'error', error_message: message })
      .eq('id', contract_id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
