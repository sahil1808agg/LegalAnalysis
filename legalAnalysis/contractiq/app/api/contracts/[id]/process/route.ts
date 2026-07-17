import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExtractionPrompt, parseExtractionResponse, getStandardTerms } from '@/lib/openai/extractionPrompt'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { customTerms?: unknown }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const customTerms = Array.isArray(body.customTerms) ? body.customTerms : []

  if (customTerms.length > 5) {
    return NextResponse.json({ error: 'Maximum 5 custom terms allowed.' }, { status: 400 })
  }

  const validCustomTerms = customTerms
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim())

  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('id, user_id, status, contract_text, type')
    .eq('id', params.id)
    .single()

  if (fetchError || !contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 })
  }

  if (contract.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  if (contract.status !== 'processing') {
    return NextResponse.json({ error: 'Contract is not ready for processing.' }, { status: 400 })
  }

  // Fire-and-forget: AI extraction runs after this response is sent
  runExtraction({
    contractId: params.id,
    userId: session.user.id,
    contractText: contract.contract_text as string,
    contractType: contract.type as 'NDA' | 'MSA',
    customTerms: validCustomTerms,
  }).catch(() => {
    // Best-effort status update — ignore secondary failure
  })

  return NextResponse.json({ contractId: params.id, status: 'processing' }, { status: 202 })
}

async function runExtraction({
  contractId,
  userId,
  contractText,
  contractType,
  customTerms,
}: {
  contractId: string
  userId: string
  contractText: string
  contractType: 'NDA' | 'MSA'
  customTerms: string[]
}) {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const markError = () => supabase.from('contracts').update({ status: 'error' }).eq('id', contractId)

  try {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = buildExtractionPrompt(contractType, customTerms)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contractText },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    let terms = parseExtractionResponse(raw)

    if (!terms) {
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contractText },
          { role: 'assistant', content: raw },
          {
            role: 'user',
            content:
              'Your response was not valid JSON with a "terms" array. Return only a JSON object with a "terms" array.',
          },
        ],
      })
      terms = parseExtractionResponse(retry.choices[0]?.message?.content ?? '')
    }

    if (!terms || terms.length === 0) {
      await markError()
      return
    }

    const standardTermSet = new Set(
      getStandardTerms(contractType).map((t) => t.toLowerCase())
    )

    const rows = terms.map((term) => ({
      contract_id: contractId,
      user_id: userId,
      term_name: term.term_name,
      value: term.value,
      page_number: term.page_number,
      confidence_score: term.confidence_score,
      source_sentence: term.source_sentence,
      is_custom: !standardTermSet.has(term.term_name.toLowerCase()),
    }))

    const { error: insertError } = await supabase.from('key_terms').insert(rows)
    if (insertError) {
      await markError()
      return
    }

    await supabase.from('contracts').update({ status: 'complete' }).eq('id', contractId)
  } catch {
    await markError()
  }
}
