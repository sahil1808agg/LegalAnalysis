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

const NDA_TERMS = [
  'Parties', 'Effective Date', 'Confidentiality Obligations', 'Permitted Disclosures',
  'Term & Duration', 'Governing Law', 'Jurisdiction', 'IP Ownership', 'Non-Solicitation', 'Breach & Remedy',
]

const MSA_TERMS = [
  'Parties', 'Service Scope', 'Payment Terms', 'Invoice Schedule', 'Late Payment Penalty',
  'Liability Cap', 'Indemnification', 'IP Ownership', 'Termination Clause',
  'Governing Law', 'Dispute Resolution', 'Notice Period',
]

const SYSTEM_PROMPT_BASE = `You are a contract analysis expert. Extract key terms from the legal contract provided.

Return ONLY a JSON object in this exact format:
{
  "terms": [
    {
      "term_name": "string",
      "value": "string — the extracted value or 'Not found' if absent",
      "page_number": 1,
      "confidence_score": 0.95,
      "source_sentence": "verbatim sentence from the contract"
    }
  ]
}

Rules:
- Extract every term in the list below, even if not found (set value to "Not found", confidence_score to 0.1)
- Never fabricate values — only use text present in the document
- source_sentence must be an exact quote from the document
- page_number must match the [PAGE N] markers in the document text
- confidence_score reflects your certainty (0.0–1.0)

--- FEW-SHOT EXAMPLES ---

[NDA Example 1]
Source text: "...This Agreement shall be governed by the laws of the State of Delaware... [PAGE 8]"
Output: { "term_name": "Governing Law", "value": "State of Delaware", "page_number": 8, "confidence_score": 0.97, "source_sentence": "This Agreement shall be governed by the laws of the State of Delaware." }

[NDA Example 2 — term absent]
Output: { "term_name": "Non-Solicitation", "value": "Not found", "page_number": 1, "confidence_score": 0.1, "source_sentence": "No non-solicitation clause found in the document." }

[MSA Example 1]
Source text: "...In no event shall either party's aggregate liability exceed the total fees paid in the three (3) months preceding the claim... [PAGE 12]"
Output: { "term_name": "Liability Cap", "value": "Fees paid in the 3 months preceding the claim", "page_number": 12, "confidence_score": 0.93, "source_sentence": "In no event shall either party's aggregate liability exceed the total fees paid in the three (3) months preceding the claim." }

--- END EXAMPLES ---

Extract these terms from the contract:`

function sanitiseCustomTerm(term: string): string {
  return term.replace(/[^\w\s&/-]/g, '').slice(0, 100).trim()
}

function buildPrompt(type: string, customTerms: string[]): string {
  const standard = type === 'NDA' ? NDA_TERMS : MSA_TERMS
  const sanitised = customTerms.map(sanitiseCustomTerm).filter(Boolean)
  const all = [...standard, ...sanitised]
  return SYSTEM_PROMPT_BASE + '\n' + all.map((t, i) => `${i + 1}. ${t}`).join('\n')
}

function parseResponse(raw: string) {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.terms)) return null
    return parsed.terms
      .map((t: Record<string, unknown>) => ({
        term_name: String(t.term_name || ''),
        value: String(t.value || 'Not found'),
        page_number: Math.max(1, parseInt(String(t.page_number || '1')) || 1),
        confidence_score: Math.min(1, Math.max(0, parseFloat(String(t.confidence_score || '0')) || 0)),
        source_sentence: String(t.source_sentence || ''),
      }))
      .filter((t: { term_name: string }) => t.term_name.length > 0)
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
    const { contract_id, custom_terms = [] } = await req.json()

    if (!contract_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validCustomTerms = Array.isArray(custom_terms)
      ? custom_terms.filter((t: unknown) => typeof t === 'string').slice(0, 5)
      : []

    const { data: contract, error } = await supabase
      .from('contracts')
      .select('contract_text, type')
      .eq('id', contract_id)
      .eq('user_id', user.id)
      .single()

    if (error || !contract) {
      return new Response(
        JSON.stringify({ error: 'Contract not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = buildPrompt(contract.type, validCustomTerms)
    let terms = null

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(Math.pow(2, attempt - 1) * 1000)

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 2000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contract.contract_text },
          ],
        })

        const raw = completion.choices[0].message.content ?? ''
        terms = parseResponse(raw)
        if (terms) break

        if (attempt === 0) {
          const retry = await openai.chat.completions.create({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 2000,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: contract.contract_text },
              { role: 'assistant', content: raw },
              {
                role: 'user',
                content: 'Your previous response was not valid JSON. Return ONLY the JSON object {"terms": [...]}, no explanation.',
              },
            ],
          })
          terms = parseResponse(retry.choices[0].message.content ?? '')
          if (terms) break
        }
      } catch (err) {
        const openAiErr = err as { status?: number }
        if (openAiErr.status === 400) break
      }
    }

    if (!terms) {
      await supabase.from('contracts').update({ status: 'error' }).eq('id', contract_id)
      return new Response(
        JSON.stringify({ error: 'Analysis failed. Please try again in a few minutes.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rows = terms.map((t: {
      term_name: string; value: string; page_number: number;
      confidence_score: number; source_sentence: string
    }) => ({
      contract_id,
      user_id: user.id,
      term_name: t.term_name,
      value: t.value,
      page_number: t.page_number,
      confidence_score: t.confidence_score,
      source_sentence: t.source_sentence,
      is_custom: validCustomTerms.includes(t.term_name),
    }))

    await supabase.from('key_terms').insert(rows)
    await supabase.from('contracts').update({ status: 'complete' }).eq('id', contract_id)

    return new Response(
      JSON.stringify({ terms_count: rows.length, contract_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('process-contract error:', err)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
