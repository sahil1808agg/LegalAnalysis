'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'

type Tab = 'signin' | 'signup'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: Tab
}

function getSignInError(code: string): string {
  if (code.includes('invalid_credentials')) return 'Incorrect email or password.'
  if (code.includes('email_not_confirmed')) return 'Please verify your email before signing in.'
  if (code.includes('over_request_rate_limit')) return 'Too many sign-in attempts. Please wait 60 seconds.'
  return 'Sign-in failed — please try again.'
}

function getSignUpError(code: string): string {
  if (code.includes('email_address_invalid')) return 'Please enter a valid email address.'
  if (code.includes('user_already_exists') || code.includes('email_exists')) return 'An account with this email already exists.'
  if (code.includes('weak_password')) return 'Password must be at least 8 characters.'
  return 'Sign-up failed — please try again.'
}

export function AuthModal({ isOpen, onClose, defaultTab = 'signin' }: AuthModalProps) {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<Tab>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTab(defaultTab)
    setEmail('')
    setPassword('')
    setError(null)
    setSuccess(null)
  }, [isOpen, defaultTab])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(getSignInError(error.message))
      return
    }
    onClose()
    router.push('/dashboard')
  }

  const handleSignUp = async (e: React.FormEvent) => {
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
      setError(getSignUpError(error.message))
      return
    }
    setSuccess('Check your email to verify your account.')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grey-900/60 p-4"
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      aria-modal="true"
      role="dialog"
      aria-label={tab === 'signin' ? 'Sign in' : 'Create account'}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex gap-1 rounded-lg border border-grey-100 bg-grey-25 p-1">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setSuccess(null) }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-grey-900 shadow-sm' : 'text-grey-400 hover:text-grey-600'
              }`}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {success ? (
          <div className="rounded-lg border border-green-500 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        ) : (
          <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp} className="flex flex-col gap-4">
            <Input
              id="auth-email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              id="auth-password"
              type="password"
              label="Password"
              placeholder={tab === 'signup' ? 'At least 8 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              minLength={tab === 'signup' ? 8 : undefined}
            />
            {error && (
              <p className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
              {tab === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
