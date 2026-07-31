import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EquipmentSection } from './EquipmentSection'
import type { EquipmentItem } from '@/lib/types'

const items: EquipmentItem[] = [
  {
    id: '1',
    name: 'Meter A',
    category: 'meter_detector',
    status: 'in_service',
    lastUpdatedBy: 'J. Smith',
    lastUpdatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Suit B',
    category: 'ppe',
    status: 'out_of_service',
    lastUpdatedBy: 'J. Smith',
    lastUpdatedAt: new Date().toISOString(),
  },
]

describe('EquipmentSection', () => {
  it('groups items by category and shows correct status color', () => {
    render(<EquipmentSection items={items} updatedBy="A. Lee" onChanged={() => {}} />)
    expect(screen.getByText('Meters & Detectors')).toBeInTheDocument()
    expect(screen.getByText('PPE')).toBeInTheDocument()
    expect(screen.getByTestId('status-1')).toHaveClass('text-green-600')
    expect(screen.getByTestId('status-2')).toHaveClass('text-red-600')
  })

  it('omits categories with no active items', () => {
    render(<EquipmentSection items={items} updatedBy="A. Lee" onChanged={() => {}} />)
    expect(screen.queryByText('Tools & Misc')).not.toBeInTheDocument()
  })

  it('offers a Retire action for every active item', () => {
    render(<EquipmentSection items={items} updatedBy="A. Lee" onChanged={() => {}} />)
    expect(screen.getAllByText('Retire')).toHaveLength(2)
  })
})
