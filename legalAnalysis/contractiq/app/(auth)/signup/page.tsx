'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'

function getErrorMessage(msg: string): string {
  if (msg.includes('user_already_exists') || msg.includes('email_exists')) return 'An account with this email already exists.'
  if (msg.includes('weak_password')) return 'Password must be at least 8 characters.'
  if (msg.includes('email_address_invalid')) return 'Please enter a valid email address.'
  return 'Sign-up failed — please try again.'
}

export default function SignupPage() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) {
      setError(getErrorMessage(error.message))
      return
    }
    setDone(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey-25 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-semibold text-grey-900">
            ContractIQ
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-grey-900">Create your account</h1>
          <p className="mt-1 text-sm text-grey-400">Start reviewing contracts in minutes</p>
        </div>

        {done ? (
          <div className="rounded-xl border border-green-500 bg-green-50 p-6 text-center">
            <p className="text-2xl">📬</p>
            <p className="mt-2 font-semibold text-green-700">Check your email</p>
            <p className="mt-1 text-sm text-grey-500">
              We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-grey-100 bg-white p-8">
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
            {error && (
              <p className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
              Create Account
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-grey-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
