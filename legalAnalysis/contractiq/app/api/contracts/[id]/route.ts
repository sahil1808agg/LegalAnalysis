import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, name, type, status, page_count, created_at, file_path, user_id, contract_text')
    .eq('id', params.id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  if (contract.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  let signedUrl: string | null = null
  if (contract.file_path) {
    const { data: urlData } = await supabase.storage
      .from('contracts')
      .createSignedUrl(contract.file_path, 3600)
    signedUrl = urlData?.signedUrl ?? null
  }

  const { data: keyTermsRaw } = await supabase
    .from('key_terms')
    .select('id, term_name, value, page_number, confidence_score, source_sentence, is_custom, is_edited, original_ai_value')
    .eq('contract_id', params.id)
    .order('created_at', { ascending: true })

  const keyTerms = (keyTermsRaw ?? []).map((t) => ({
    id: t.id,
    contractId: params.id,
    termName: t.term_name,
    value: t.value,
    pageNumber: t.page_number,
    confidenceScore: t.confidence_score,
    sourceSentence: t.source_sentence,
    isCustom: t.is_custom,
    isEdited: t.is_edited,
    originalAiValue: t.original_ai_value,
    createdAt: '',
  }))

  await supabase
    .from('contracts')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({
    id: contract.id,
    name: contract.name,
    type: contract.type,
    status: contract.status,
    pageCount: contract.page_count,
    createdAt: contract.created_at,
    contractText: contract.contract_text ?? '',
    signedUrl,
    keyTerms,
  })
}
