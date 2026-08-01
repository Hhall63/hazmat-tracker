import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProblemsBanner } from './ProblemsBanner'
import type { LogEntry } from '@/lib/types'

describe('ProblemsBanner', () => {
  it('renders nothing when there are no open problems', () => {
    const { container } = render(<ProblemsBanner latestProblem={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the description and a name/date footnote', () => {
    const entry: LogEntry = {
      id: '1',
      createdAt: '2026-07-30T18:00:00.000Z',
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    }
    render(<ProblemsBanner latestProblem={entry} />)
    expect(screen.getByText('Decon pump leaking')).toBeInTheDocument()
    expect(screen.getByText('— J. Smith, Jul 30')).toBeInTheDocument()
  })
})
