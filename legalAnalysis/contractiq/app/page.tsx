export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-28 py-5 border-b border-grey-50">
        <span className="text-grey-900 font-semibold text-xl">ContractIQ</span>
        <div className="flex items-center gap-3">
          <a href="/login" className="btn-ghost">Sign In</a>
          <a href="/signup" className="btn-primary">Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-28 py-24 text-center">
        <div className="max-w-3xl flex flex-col gap-6">
          <div className="inline-flex self-center items-center px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-500 text-xs font-medium">
            NDA &amp; MSA review in ≤ 15 minutes
          </div>

          <h1 className="text-5xl font-bold text-grey-900 leading-tight">
            Understand what you&apos;re signing —{' '}
            <span className="text-blue-500">before</span> you sign it.
          </h1>

          <p className="text-base font-medium text-grey-500 max-w-xl mx-auto leading-6">
            ContractIQ extracts key terms from NDAs and MSAs with AI precision.
            Source sentences, page references, and confidence scores — no lawyer required.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <a href="/signup" className="btn-primary px-6 py-3 text-base">
              Review your first contract free
            </a>
            <a href="/login" className="btn-ghost px-6 py-3 text-base">
              Sign In
            </a>
          </div>

          <p className="text-xs text-grey-400">
            No credit card required · Text-layer PDFs only · NDAs &amp; MSAs
          </p>
        </div>
      </main>

      {/* Features */}
      <section className="px-28 pb-24">
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'Instant extraction',
              body: 'GPT-4o identifies governing law, liability caps, IP ownership, and 10+ other key terms — with the exact page number and source sentence.',
            },
            {
              icon: '🎯',
              title: 'Confidence scoring',
              body: 'Every term gets a confidence score. Low-confidence terms are flagged with ⚠️ so you know exactly where to double-check.',
            },
            {
              icon: '💬',
              title: 'Chat with your contract',
              body: 'Ask plain-English questions and get document-grounded answers with mandatory page citations. No hallucinations.',
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col gap-4 p-6 rounded-lg border border-grey-100 bg-grey-25"
            >
              <span className="text-2xl">{icon}</span>
              <h3 className="text-2xl font-medium text-grey-900 leading-8">{title}</h3>
              <p className="text-base font-medium text-grey-500 leading-6">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer disclaimer */}
      <footer className="px-28 py-5 border-t border-grey-50">
        <p className="text-xs text-grey-400 text-center">
          ContractIQ is an AI-assisted review tool, not legal advice.
          Always verify critical terms with a qualified lawyer.
        </p>
      </footer>
    </div>
  )
}
