import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LoginSchema } from '@/lib/security/inputValidator'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const result = LoginSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid email or password format.' }, { status: 422 })
  }

  const { email, password } = result.data

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}
