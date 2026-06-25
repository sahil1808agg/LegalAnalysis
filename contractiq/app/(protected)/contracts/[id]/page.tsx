import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { type Contract, type KeyTerm } from '@/types'
import { ResultsPageClient } from './ResultsPageClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('contracts')
    .select('title')
    .eq('id', params.id)
    .single()
  return { title: data?.title ? `${data.title} — ContractIQ` : 'Contract Review — ContractIQ' }
}

export default async function ContractResultsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const serviceClient = createServiceClient()

  const { data: contract } = await serviceClient
    .from('contracts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!contract) notFound()

  let initialTerms: KeyTerm[] = []
  if (contract.status === 'completed') {
    const { data: terms } = await serviceClient
      .from('key_terms')
      .select('*')
      .eq('contract_id', params.id)
      .order('created_at', { ascending: true })
    initialTerms = (terms ?? []) as KeyTerm[]
  }

  return (
    <ResultsPageClient
      contract={contract as Contract}
      initialTerms={initialTerms}
    />
  )
}
