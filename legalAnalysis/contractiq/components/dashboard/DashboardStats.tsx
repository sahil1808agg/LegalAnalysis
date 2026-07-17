import { Card } from '@/components/ui/Card'
import { DashboardStats as Stats } from '@/types'

interface DashboardStatsProps {
  stats: Stats
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const items = [
    { label: 'Total Contracts', value: stats.total },
    { label: 'NDAs', value: stats.byType.NDA },
    { label: 'MSAs', value: stats.byType.MSA },
  ]
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(({ label, value }) => (
        <Card key={label}>
          <p className="text-3xl font-bold text-grey-900">{value}</p>
          <p className="mt-1 text-xs font-normal text-grey-400">{label}</p>
        </Card>
      ))}
    </div>
  )
}
