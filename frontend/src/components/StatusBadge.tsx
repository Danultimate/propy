import { cn } from '@/lib/utils'
import type { AnalysisRun } from '@/lib/api'

const styles: Record<AnalysisRun['status'], string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  running:   'bg-blue-100 text-blue-800 animate-pulse',
  completed: 'bg-green-100 text-green-800',
  failed:    'bg-red-100 text-red-800',
}

export function StatusBadge({ status }: { status: AnalysisRun['status'] }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', styles[status])}>
      {status}
    </span>
  )
}
