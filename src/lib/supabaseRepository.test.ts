import { describe, it, expect } from 'vitest'
import { mapRowToTank, mapRowToEquipmentItem, mapRowToLogEntry } from './supabaseRepository'

describe('mapRowToTank', () => {
  it('converts a snake_case row to a Tank', () => {
    const row = {
      id: '1',
      gas_type: 'Methane',
      assigned_meter: 'Meter 1',
      psi: 2200,
      max_psi: 2216,
      status: 'in_use',
      last_updated_by: 'J. Smith',
      last_updated_at: '2026-07-30T18:00:00.000Z',
    }
    expect(mapRowToTank(row)).toEqual({
      id: '1',
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      lastUpdatedBy: 'J. Smith',
      lastUpdatedAt: '2026-07-30T18:00:00.000Z',
    })
  })
})

describe('mapRowToEquipmentItem', () => {
  it('converts a snake_case row to an EquipmentItem', () => {
    const row = {
      id: '1',
      name: 'SCBA Pack 3',
      category: 'ppe',
      status: 'in_service',
      last_updated_by: 'J. Smith',
      last_updated_at: '2026-07-30T18:00:00.000Z',
    }
    expect(mapRowToEquipmentItem(row)).toEqual({
      id: '1',
      name: 'SCBA Pack 3',
      category: 'ppe',
      status: 'in_service',
      lastUpdatedBy: 'J. Smith',
      lastUpdatedAt: '2026-07-30T18:00:00.000Z',
    })
  })
})

describe('mapRowToLogEntry', () => {
  it('converts a snake_case row to a LogEntry', () => {
    const row = {
      id: '1',
      created_at: '2026-07-30T18:00:00.000Z',
      created_by: 'J. Smith',
      entry_type: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    }
    expect(mapRowToLogEntry(row)).toEqual({
      id: '1',
      createdAt: '2026-07-30T18:00:00.000Z',
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    })
  })
})
