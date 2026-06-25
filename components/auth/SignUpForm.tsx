'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignUpForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVerify, setShowVerify] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })

    setIsLoading(false)

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists. Sign in instead.')
      } else {
        setError(authError.message)
      }
      return
    }

    setShowVerify(true)
  }

  if (showVerify) {
    return (
      <div className="text-center py-4">
        <p className="text-sm font-semibold text-text-primary mb-1">Check your email</p>
        <p className="text-sm text-text-secondary">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your
          account.
        </p>
      </div>
    )
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
          minLength={8}
          autoComplete="new-password"
          className="input"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null) }}
        />
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
        {isLoading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
