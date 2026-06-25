import Link from 'next/link'
import { FileText, Shield, Zap, MessageSquare, CheckCircle, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText size={16} color="white" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-bold text-text-primary">ContractIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link href="/sign-up" className="btn-primary text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-accent-light text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap size={12} strokeWidth={2} />
            NDA & MSA review in under 15 minutes
          </div>
          <h1 className="text-5xl font-bold text-text-primary leading-tight mb-6">
            Understand any contract
            <br />
            <span className="text-primary">before you sign.</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed mb-10">
            ContractIQ extracts the key terms from your NDA or MSA, shows exactly where each clause
            lives in the document, scores how confident the AI is — and lets you ask questions in
            plain English.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up" className="btn-primary px-8 py-3 text-base">
              Start reviewing for free
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
            <Link href="/sign-in" className="btn-ghost px-8 py-3 text-base">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-text-muted">
            14-day free trial · No credit card required
          </p>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="bg-surface border-y border-border py-5">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-sm text-text-muted">
            Trusted by founders, ops managers, and freelancers reviewing NDAs and MSAs
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background-subtle">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-text-primary mb-3">
              Everything you need to review a contract
            </h2>
            <p className="text-text-secondary text-base max-w-xl mx-auto">
              Stop spending 90 minutes on a contract that should take 15.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileText size={22} strokeWidth={1.5} color="#112E81" />}
              title="Key Term Extraction"
              description="Automatically pulls the 10–12 terms that matter most for your contract type — with the exact page number and source sentence for every result."
            />
            <FeatureCard
              icon={<Shield size={22} strokeWidth={1.5} color="#112E81" />}
              title="Confidence Scoring"
              description="Every extracted term comes with a confidence score so you know exactly which clauses to verify yourself. Low confidence items are flagged with a warning."
            />
            <FeatureCard
              icon={<MessageSquare size={22} strokeWidth={1.5} color="#112E81" />}
              title="Chat with Your Contract"
              description='Ask questions in plain English — "What happens if I breach this NDA?" — and get answers grounded strictly in the document text, with page citations.'
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-text-primary mb-3">How it works</h2>
            <p className="text-text-secondary text-base">Three steps. Under 15 minutes.</p>
          </div>
          <div className="space-y-6">
            <Step
              number="01"
              title="Upload your contract"
              description="Drop in a PDF of your NDA or MSA (up to 20 pages). Select the contract type so ContractIQ uses the right term library."
            />
            <Step
              number="02"
              title="Review the extracted terms"
              description="See every key clause — Governing Law, Liability Cap, IP Ownership, and more — with the page reference, confidence score, and the source sentence the AI used."
            />
            <Step
              number="03"
              title="Ask the hard questions"
              description='Use the chat interface to dig into specific clauses. Every AI answer cites the exact page it pulled the answer from — no hallucination, no guesswork.'
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Stop signing contracts you don&apos;t fully understand.
          </h2>
          <p className="text-accent text-base mb-8 leading-relaxed">
            ContractIQ gives you the legal clarity you need — at a fraction of the cost of a
            lawyer review.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-3 rounded-lg text-base hover:bg-accent-light transition-colors"
          >
            Start your free trial
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
          <p className="mt-4 text-xs text-accent">
            $19/month after trial · Cancel any time
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <FileText size={12} color="white" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold text-text-primary">ContractIQ</span>
          </div>
          <p className="text-xs text-text-muted">
            Powered by OpenAI GPT-4o · Not legal advice · © 2026 ContractIQ
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="card">
      <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  )
}

function Step({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center">
        <span className="text-primary font-bold text-sm">{number}</span>
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <CheckCircle size={15} color="#16A34A" strokeWidth={2} />
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
