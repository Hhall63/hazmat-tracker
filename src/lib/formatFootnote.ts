import type { LogEntry } from './types'

export function formatFootnote(entry: LogEntry): string {
  const date = new Date(entry.createdAt)
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return `— ${entry.createdBy}, ${formatted}`
}
