import { cn } from '@/lib/utils/cn'

type Stage = 'uploading' | 'extracting' | 'processing' | 'done'

interface ProcessingProgressProps {
  stage: Stage
}

const steps: { label: string; activeOn: Stage[] }[] = [
  { label: 'Extracting text', activeOn: ['uploading', 'extracting'] },
  { label: 'Analysing with AI', activeOn: ['processing'] },
  { label: 'Compiling results', activeOn: ['done'] },
]

function getStepState(step: { activeOn: Stage[] }, stage: Stage): 'pending' | 'active' | 'done' {
  const order: Stage[] = ['uploading', 'extracting', 'processing', 'done']
  const stepIdx = order.findIndex((s) => step.activeOn.includes(s))
  const currentIdx = order.indexOf(stage)
  if (currentIdx > stepIdx + (step.activeOn.length - 1)) return 'done'
  if (step.activeOn.includes(stage)) return 'active'
  return 'pending'
}

export function ProcessingProgress({ stage }: ProcessingProgressProps) {
  return (
    <div className="flex flex-col gap-4">
      {steps.map((step, i) => {
        const state = getStepState(step, stage)
        return (
          <div key={i} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium',
                state === 'done' && 'border-green-500 bg-green-500 text-white',
                state === 'active' && 'border-blue-500 bg-white text-blue-500',
                state === 'pending' && 'border-grey-200 bg-white text-grey-300'
              )}
            >
              {state === 'done' ? (
                '✓'
              ) : state === 'active' ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                state === 'done' && 'text-green-700',
                state === 'active' && 'text-blue-500',
                state === 'pending' && 'text-grey-300'
              )}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
