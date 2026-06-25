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
    .select('user_id, file_path')
    .eq('id', params.id)
    .single()

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (contract.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!contract.file_path) {
    return NextResponse.json(
      { error: 'PDF not available. The text viewer will be used instead.' },
      { status: 404 }
    )
  }

  const { data, error: urlError } = await serviceClient.storage
    .from('contracts')
    .createSignedUrl(contract.file_path, 3600)

  if (urlError || !data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }

  return NextResponse.json({ signed_url: data.signedUrl })
}
