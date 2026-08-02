import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatBar } from './StatBar'
import type { EquipmentItem, LogEntry, Tank } from '@/lib/types'

describe('StatBar', () => {
  it('renders open problems, low tanks, and equipment in service counts', () => {
    const tanks: Tank[] = [
      {
        id: '1',
        gasType: 'Oxygen',
        assignedMeter: null,
        psi: 200,
        maxPsi: 2200,
        status: 'in_use',
        lastUpdatedBy: 'A',
        lastUpdatedAt: new Date().toISOString(),
      },
    ]
    const equipment: EquipmentItem[] = [
      {
        id: '1',
        name: 'SCBA',
        category: 'meter_detector',
        status: 'in_service',
        lastUpdatedBy: 'A',
        lastUpdatedAt: new Date().toISOString(),
      },
    ]
    const logEntries: LogEntry[] = [
      {
        id: '1',
        createdAt: new Date().toISOString(),
        createdBy: 'A',
        entryType: 'problem_note',
        description: 'issue',
        resolved: false,
      },
    ]

    render(<StatBar tanks={tanks} equipment={equipment} logEntries={logEntries} />)

    expect(screen.getByTestId('stat-bar')).toBeInTheDocument()
    expect(screen.getByText('Open Problems')).toBeInTheDocument()
    expect(screen.getByText('Tanks Low')).toBeInTheDocument()
    expect(screen.getByText('Equipment In Service')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(3)
  })

  it('renders a bad tone for Equipment In Service when the count is zero', () => {
    render(<StatBar tanks={[]} equipment={[]} logEntries={[]} />)
    const labelEl = screen.getByText('Equipment In Service')
    const valueEl = labelEl.previousElementSibling
    expect(valueEl).toHaveClass('text-status-red')
  })
})
