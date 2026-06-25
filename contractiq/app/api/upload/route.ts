import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parsePdf } from '@/lib/pdf/parse'
import { UploadSchema } from '@/lib/validation/schemas'
import { sanitizeFilename } from '@/lib/utils/strings'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File is too large. Maximum size is 10 MB.' }, { status: 400 })
  }

  const rawContractType = formData.get('contract_type')
  const rawTitle = formData.get('title')

  const parsed = UploadSchema.safeParse({
    contract_type: rawContractType,
    title: rawTitle ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid contract type. Must be NDA or MSA.' },
      { status: 400 }
    )
  }

  const { contract_type, title } = parsed.data
  const contractTitle = title ?? sanitizeFilename(file.name)

  const buffer = Buffer.from(await file.arrayBuffer())

  let parsed_pdf
  try {
    parsed_pdf = await parsePdf(buffer)
  } catch {
    return NextResponse.json({ error: 'Failed to read PDF. The file may be corrupted.' }, { status: 422 })
  }

  if (parsed_pdf.pageCount > 20) {
    return NextResponse.json(
      { error: 'This contract is too long. Maximum is 20 pages.' },
      { status: 400 }
    )
  }

  if (parsed_pdf.wordCount < 100) {
    return NextResponse.json(
      {
        error:
          'Scanned PDFs are not supported yet. Please upload a text-layer PDF.',
      },
      { status: 422 }
    )
  }

  const serviceClient = createServiceClient()

  const { data: contract, error: insertError } = await serviceClient
    .from('contracts')
    .insert({
      user_id: user.id,
      title: contractTitle,
      contract_type,
      contract_text: parsed_pdf.text,
      page_count: parsed_pdf.pageCount,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !contract) {
    return NextResponse.json({ error: 'Failed to save contract. Please try again.' }, { status: 500 })
  }

  // Fire-and-forget Storage upload — non-blocking
  const storagePath = `contracts/${user.id}/${contract.id}/${file.name}`
  serviceClient.storage
    .from('contracts')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true })
    .then(({ error: storageError }) => {
      if (!storageError) {
        serviceClient
          .from('contracts')
          .update({ file_path: storagePath })
          .eq('id', contract.id)
          .then(() => {})
      }
    })

  return NextResponse.json({ contract_id: contract.id, status: 'pending' }, { status: 201 })
}
