import { Badge } from '@/components/ui/Badge'
import { getStandardTerms } from '@/lib/openai/extractionPrompt'
import { ContractType } from '@/types'

interface KeyTermPreviewProps {
  contractType: ContractType | null
  customTerms: string[]
}

export function KeyTermPreview({ contractType, customTerms }: KeyTermPreviewProps) {
  if (!contractType) {
    return (
      <div className="rounded-lg border border-grey-100 bg-grey-25 p-4 text-center text-sm text-grey-300">
        Select a contract type to preview terms that will be extracted
      </div>
    )
  }

  const standard = getStandardTerms(contractType)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-grey-900">
        Terms to extract ({standard.length + customTerms.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {standard.map((term) => (
          <Badge key={term} variant="neutral">
            {term}
          </Badge>
        ))}
        {customTerms.map((term) => (
          <Badge key={term} variant="info">
            {term} · Custom
          </Badge>
        ))}
      </div>
    </div>
  )
}
