import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LogTable } from './LogTable'
import type { LogEntry } from '@/lib/types'

const entries: LogEntry[] = [
  {
    id: '1',
    createdAt: '2026-07-30T18:00:00.000Z',
    createdBy: 'J. Smith',
    entryType: 'problem_note',
    description: 'Decon pump leaking',
    resolved: false,
  },
  {
    id: '2',
    createdAt: '2026-07-29T18:00:00.000Z',
    createdBy: 'A. Lee',
    entryType: 'tank_update',
    description: 'Methane tank PSI updated from 2200 to 1800',
    resolved: null,
  },
]

describe('LogTable', () => {
  it('shows a resolve button only for unresolved problem notes', () => {
    render(<LogTable entries={entries} onResolve={vi.fn()} />)
    expect(screen.getAllByText('Mark resolved')).toHaveLength(1)
  })
})
