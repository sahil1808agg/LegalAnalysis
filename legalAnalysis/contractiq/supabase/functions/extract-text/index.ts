import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function segmentPages(pages: string[]): string {
  return pages
    .map((text, i) => `[PAGE ${i + 1}] ${text.trim()}`)
    .join(' ')
    .trim()
}

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
    const { contract_id, file_base64, filename } = await req.json()

    if (!contract_id || !file_base64) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const binaryStr = atob(file_base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    // @ts-ignore — Deno npm: specifier
    const pdfParse = await import('npm:pdf-parse@1.1.1')

    const pageTexts: string[] = []
    let pageCount = 0

    const options = {
      pagerender: (pageData: { getTextContent: () => Promise<{ items: { str: string }[] }> }) => {
        return pageData.getTextContent().then((content) => {
          const text = content.items.map((item) => item.str).join(' ')
          pageTexts.push(text)
          return text
        })
      },
    }

    const result = await pdfParse.default(Buffer.from(bytes), options)
    pageCount = result.numpages

    if (pageTexts.length === 0 && result.text) {
      pageTexts.push(result.text)
    }

    if (pageCount > 20) {
      return new Response(
        JSON.stringify({
          error: 'TOO_MANY_PAGES',
          message: 'Document exceeds 20 pages.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fullText = segmentPages(pageTexts.length > 0 ? pageTexts : [result.text ?? ''])
    const wordCount = fullText.split(/\s+/).filter(Boolean).length

    if (wordCount < 100) {
      return new Response(
        JSON.stringify({
          error: 'SCANNED_PDF',
          message: 'This appears to be a scanned PDF. Scanned PDFs are not supported yet.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenCount = Math.ceil(fullText.length / 4)
    if (tokenCount > 15000) {
      return new Response(
        JSON.stringify({
          error: 'TOKEN_LIMIT_EXCEEDED',
          message: 'This contract is too long for analysis. Support for longer contracts is coming soon.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let file_path: string | null = null
    const uploadFilename = filename || `${contract_id}.pdf`
    const { data: storageData } = await supabase.storage
      .from('contracts')
      .upload(`${user.id}/${contract_id}/${uploadFilename}`, bytes, {
        contentType: 'application/pdf',
        upsert: false,
      })
    file_path = storageData?.path ?? null

    await supabase
      .from('contracts')
      .update({
        contract_text: fullText,
        page_count: pageCount,
        token_count: tokenCount,
        file_path,
        status: 'processing',
      })
      .eq('id', contract_id)
      .eq('user_id', user.id)

    return new Response(
      JSON.stringify({ contract_id, page_count: pageCount, status: 'processing' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('extract-text error:', err)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
