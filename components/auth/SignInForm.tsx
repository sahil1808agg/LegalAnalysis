'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    setIsLoading(false)

    if (authError) {
      setError('Invalid email or password.')
      return
    }

    router.push(redirectTo ?? '/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">Email address</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          placeholder="Your password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null) }}
        />
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
        {isLoading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
