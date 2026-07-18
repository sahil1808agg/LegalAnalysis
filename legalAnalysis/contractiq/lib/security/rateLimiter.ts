import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RateLimitConfig {
  action: string
  userId: string
  limit: number
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
}

export async function checkRateLimit({
  action,
  userId,
  limit,
  windowSeconds,
}: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const supabase = createAdminClient()
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

    const { count, error: countError } = await supabase
      .from('rate_limit_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', windowStart)

    // If the table is missing or any DB error occurs, fail open so a schema
    // oversight never blocks legitimate requests.
    if (countError) {
      console.error('Rate limit check failed (failing open):', countError.message)
      return { allowed: true }
    }

    if ((count ?? 0) >= limit) {
      return { allowed: false, retryAfter: windowSeconds }
    }

    await supabase.from('rate_limit_events').insert({ user_id: userId, action })

    return { allowed: true }
  } catch (err) {
    console.error('Rate limit check threw (failing open):', err)
    return { allowed: true }
  }
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    }
  )
}

export const RATE_LIMITS = {
  CHAT: { limit: 30, windowSeconds: 60 },
  CONTRACT_PROCESS: { limit: 5, windowSeconds: 3600 },
  CONTRACT_UPLOAD: { limit: 20, windowSeconds: 86400 },
} as const
