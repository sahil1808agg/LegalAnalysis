import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/components/shared/AppNav'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background-subtle">
      <AppNav userEmail={user.email ?? ''} />
      <main>{children}</main>
    </div>
  )
}
