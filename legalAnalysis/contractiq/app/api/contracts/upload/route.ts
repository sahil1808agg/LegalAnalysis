import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 25
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/security/rateLimiter'
import { validateFileUpload, UploadBodySchema } from '@/lib/security/inputValidator'
import { sanitiseFilename } from '@/lib/utils/sanitiseFilename'
import { extractPDFText } from '@/lib/pdf/extractText'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return auth.response

    const rateCheck = await checkRateLimit({
      action: 'contract_upload',
      userId: auth.user.id,
      ...RATE_LIMITS.CONTRACT_UPLOAD,
    })
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!)

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }

    const file = formData.get('file') as File | null
    const contractType = formData.get('contractType') as string | null
    const contractName = formData.get('contractName') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Please upload a file.' }, { status: 422 })
    }

    const fileValidation = validateFileUpload(file)
    if (!fileValidation.ok) {
      return NextResponse.json({ error: fileValidation.error }, { status: fileValidation.status })
    }

    const bodyValidation = UploadBodySchema.safeParse({ contractType, contractName })
    if (!bodyValidation.success) {
      return NextResponse.json({ error: 'Invalid contract type.' }, { status: 422 })
    }

    const { contractType: validContractType, contractName: validContractName } = bodyValidation.data
    const name = validContractName?.trim() || sanitiseFilename(file.name.replace(/\.[^.]+$/i, ''))

    const supabase = createClient()

    const { data: contract, error: insertError } = await supabase
      .from('contracts')
      .insert({
        user_id: auth.user.id,
        name,
        type: validContractType,
        contract_text: '',
        status: 'pending',
        page_count: 0,
      })
      .select('id')
      .single()

    if (insertError || !contract) {
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extracted: Awaited<ReturnType<typeof extractPDFText>>
    try {
      extracted = await extractPDFText(buffer)
    } catch (pdfErr) {
      console.error('PDF extraction failed:', pdfErr)
      await supabase.from('contracts').delete().eq('id', contract.id)
      return NextResponse.json({ error: 'Could not read this PDF. Please check the file and try again.' }, { status: 400 })
    }

    if (!extracted.ok) {
      await supabase.from('contracts').delete().eq('id', contract.id)

      const messages: Record<string, string> = {
        SCANNED_PDF: 'This appears to be a scanned PDF. Scanned PDFs are not supported yet.',
        TOO_MANY_PAGES: 'Document exceeds 20 pages.',
        TOKEN_LIMIT_EXCEEDED: 'This contract is too long for analysis. Support for longer contracts is coming soon.',
      }
      return NextResponse.json({ error: messages[extracted.error] }, { status: 400 })
    }

    const { text, pageCount, tokenCount } = extracted.result

    let file_path: string | null = null
    const filename = sanitiseFilename(file.name)
    const storagePath = `${auth.user.id}/${contract.id}/${filename}`

    const { data: storageData } = await supabase.storage
      .from('contracts')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })
    file_path = storageData?.path ?? null

    await supabase
      .from('contracts')
      .update({
        contract_text: text,
        page_count: pageCount,
        token_count: tokenCount,
        file_path,
        status: 'processing',
      })
      .eq('id', contract.id)

    return NextResponse.json(
      { contractId: contract.id, pageCount, status: 'processing' },
      { status: 201 }
    )
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
