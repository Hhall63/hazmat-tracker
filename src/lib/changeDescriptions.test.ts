import { describe, it, expect } from 'vitest'
import {
  describeTankPsiChange,
  describeTankStatusChange,
  describeEquipmentStatusChange,
} from './changeDescriptions'
import type { EquipmentItem, Tank } from './types'

const tank: Tank = {
  id: '1',
  gasType: 'Methane',
  assignedMeter: 'Meter 1',
  psi: 2200,
  maxPsi: 2216,
  status: 'in_use',
  lastUpdatedBy: 'J. Smith',
  lastUpdatedAt: '2026-07-30T18:00:00.000Z',
}

const item: EquipmentItem = {
  id: '1',
  name: 'SCBA Pack 3',
  category: 'ppe',
  status: 'in_service',
  lastUpdatedBy: 'J. Smith',
  lastUpdatedAt: '2026-07-30T18:00:00.000Z',
}

describe('describeTankPsiChange', () => {
  it('describes a PSI change with gas type and meter', () => {
    expect(describeTankPsiChange(tank, 1800)).toBe(
      'Methane tank (Meter 1) PSI updated from 2200 to 1800'
    )
  })

  it('falls back to "unassigned" when there is no assigned meter', () => {
    expect(describeTankPsiChange({ ...tank, assignedMeter: null }, 1800)).toBe(
      'Methane tank (unassigned) PSI updated from 2200 to 1800'
    )
  })
})

describe('describeTankStatusChange', () => {
  it('describes a status change', () => {
    expect(describeTankStatusChange(tank, 'spare')).toBe(
      'Methane tank (Meter 1) status changed from in_use to spare'
    )
  })
})

describe('describeEquipmentStatusChange', () => {
  it('describes an equipment status change', () => {
    expect(describeEquipmentStatusChange(item, 'out_of_service')).toBe(
      'SCBA Pack 3 status changed from in_service to out_of_service'
    )
  })
})
