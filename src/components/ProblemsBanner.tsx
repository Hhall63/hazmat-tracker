import { formatFootnote } from '@/lib/formatFootnote'
import type { LogEntry } from '@/lib/types'

export function ProblemsBanner({ latestProblem }: { latestProblem: LogEntry | null }) {
  if (!latestProblem) return null

  return (
    <section
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-status-red/50 bg-status-red/10 px-4 py-3"
    >
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-status-red font-black text-bg">
        !
      </span>
      <div>
        <div className="text-sm font-bold text-ink">{latestProblem.description}</div>
        <div className="text-xs text-ink-dim">{formatFootnote(latestProblem)}</div>
      </div>
    </section>
  )
}
