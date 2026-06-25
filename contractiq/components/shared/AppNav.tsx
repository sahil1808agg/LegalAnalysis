'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, LogOut, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AppNav({ userEmail }: { userEmail: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <FileText size={14} color="white" strokeWidth={1.5} />
        </div>
        <span className="text-base font-bold text-text-primary">ContractIQ</span>
      </Link>

      <div className="flex items-center gap-3">
        <Link href="/contracts/new" className="btn-primary text-xs px-3 py-2">
          <Plus size={14} strokeWidth={2} />
          Review a Contract
        </Link>
        <span className="text-xs text-text-muted hidden sm:block">{userEmail}</span>
        <button
          onClick={handleSignOut}
          className="btn-ghost text-xs px-3 py-2"
          aria-label="Sign out"
        >
          <LogOut size={14} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </header>
  )
}
