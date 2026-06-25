import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-subtle flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-border bg-white">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText size={16} color="white" strokeWidth={1.5} />
          </div>
          <span className="text-lg font-bold text-text-primary">ContractIQ</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
      <footer className="py-4 text-center">
        <p className="text-xs text-text-muted">
          ContractIQ is not legal advice. Always verify critical terms with a qualified lawyer.
        </p>
      </footer>
    </div>
  )
}
