'use client'

import type { LogEntry } from '@/lib/types'

export function LogTable({
  entries,
  onResolve,
}: {
  entries: LogEntry[]
  onResolve: (id: string) => void
}) {
  return (
    <table className="w-full text-sm text-ink">
      <thead>
        <tr className="border-b border-gold/20 text-left text-ink-dim">
          <th className="py-1">When</th>
          <th className="py-1">Who</th>
          <th className="py-1">Type</th>
          <th className="py-1">Description</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-b border-gold/10">
            <td className="py-1">{new Date(entry.createdAt).toLocaleString()}</td>
            <td className="py-1">{entry.createdBy}</td>
            <td className="py-1">{entry.entryType}</td>
            <td className="py-1">
              {entry.description}
              {entry.entryType === 'problem_note' && entry.resolved && (
                <span className="ml-2 text-xs text-status-green">(resolved)</span>
              )}
            </td>
            <td className="py-1">
              {entry.entryType === 'problem_note' && !entry.resolved && (
                <button onClick={() => onResolve(entry.id)} className="text-xs text-gold underline">
                  Mark resolved
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
