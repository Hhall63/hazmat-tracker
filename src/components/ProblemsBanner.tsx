import { formatFootnote } from '@/lib/formatFootnote'
import type { LogEntry } from '@/lib/types'

export function ProblemsBanner({ latestProblem }: { latestProblem: LogEntry | null }) {
  if (!latestProblem) {
    return <section className="text-sm text-gray-500">No open problems.</section>
  }

  return (
    <section className="border-l-4 border-red-500 pl-3">
      <div>{latestProblem.description}</div>
      <div className="text-xs text-gray-500">{formatFootnote(latestProblem)}</div>
    </section>
  )
}
