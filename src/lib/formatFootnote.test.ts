import { describe, it, expect } from 'vitest'
import { formatFootnote } from './formatFootnote'
import type { LogEntry } from './types'

describe('formatFootnote', () => {
  it('formats as "— name, Mon D"', () => {
    const entry: LogEntry = {
      id: '1',
      createdAt: '2026-07-30T18:00:00.000Z',
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    }
    expect(formatFootnote(entry)).toBe('— J. Smith, Jul 30')
  })
})
