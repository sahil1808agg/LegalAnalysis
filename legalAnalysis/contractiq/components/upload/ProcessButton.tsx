'use client'

import { Button } from '@/components/ui/Button'

interface ProcessButtonProps {
  onClick: () => void
  disabled: boolean
  loading: boolean
}

export function ProcessButton({ onClick, disabled, loading }: ProcessButtonProps) {
  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      onClick={onClick}
      disabled={disabled || loading}
      loading={loading}
      className="w-full"
    >
      {loading ? 'Processing…' : 'Process Contract'}
    </Button>
  )
}
