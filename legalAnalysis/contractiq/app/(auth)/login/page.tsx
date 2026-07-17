'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'

function getErrorMessage(msg: string): string {
  if (msg.includes('invalid_credentials')) return 'Incorrect email or password.'
  if (msg.includes('email_not_confirmed')) return 'Please verify your email before signing in.'
  if (msg.includes('over_request_rate_limit')) return 'Too many sign-in attempts. Please wait 60 seconds.'
  return 'Sign-in failed — please try again.'
}

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(getErrorMessage(error.message))
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grey-25 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-semibold text-grey-900">
            ContractIQ
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-grey-900">Welcome back</h1>
          <p className="mt-1 text-sm text-grey-400">Sign in to your account</p>
        </div>

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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-grey-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-blue-500 hover:text-blue-600">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
