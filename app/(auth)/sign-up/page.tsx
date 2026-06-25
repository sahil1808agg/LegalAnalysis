import Link from 'next/link'
import SignUpForm from '@/components/auth/SignUpForm'

export const metadata = { title: 'Create account — ContractIQ' }

export default function SignUpPage() {
  return (
    <div className="w-full max-w-md">
      <div className="card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
          <p className="text-sm text-text-secondary mt-1">
            Start reviewing contracts in minutes. Free for 14 days.
          </p>
        </div>
        <SignUpForm />
        <p className="mt-5 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
