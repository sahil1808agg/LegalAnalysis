import { AlertCircle } from 'lucide-react'

export default function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
      <AlertCircle size={14} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
      <span>
        <strong>Not legal advice.</strong> ContractIQ is an AI-assisted review tool. Always verify
        critical terms with a qualified lawyer before signing.
      </span>
    </div>
  )
}
