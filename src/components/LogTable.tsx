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
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th>When</th>
          <th>Who</th>
          <th>Type</th>
          <th>Description</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-b">
            <td>{new Date(entry.createdAt).toLocaleString()}</td>
            <td>{entry.createdBy}</td>
            <td>{entry.entryType}</td>
            <td>
              {entry.description}
              {entry.entryType === 'problem_note' && entry.resolved && (
                <span className="ml-2 text-xs text-green-600">(resolved)</span>
              )}
            </td>
            <td>
              {entry.entryType === 'problem_note' && !entry.resolved && (
                <button onClick={() => onResolve(entry.id)} className="text-xs underline">
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
