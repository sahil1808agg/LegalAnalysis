import Link from 'next/link'
import SignInForm from '@/components/auth/SignInForm'

export const metadata = { title: 'Sign in — ContractIQ' }

export default function SignInPage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  return (
    <div className="w-full max-w-md">
      <div className="card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to your ContractIQ account.</p>
        </div>
        <SignInForm redirectTo={searchParams.redirect} />
        <p className="mt-5 text-center text-sm text-text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-primary font-semibold hover:underline">
            Get started free
          </Link>
        </p>
      </div>
    </div>
  )
}
