import { describe, it, expect } from 'vitest'
import { computeDashboardStats } from './dashboardStats'
import type { EquipmentItem, LogEntry, Tank } from './types'

function tank(overrides: Partial<Tank> = {}): Tank {
  return {
    id: '1',
    gasType: 'Oxygen',
    assignedMeter: null,
    psi: 2000,
    maxPsi: 2200,
    status: 'in_use',
    lastUpdatedBy: 'A',
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function equipment(overrides: Partial<EquipmentItem> = {}): EquipmentItem {
  return {
    id: '1',
    name: 'SCBA',
    category: 'meter_detector',
    status: 'in_service',
    lastUpdatedBy: 'A',
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function problem(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: '1',
    createdAt: new Date().toISOString(),
    createdBy: 'A',
    entryType: 'problem_note',
    description: 'issue',
    resolved: false,
    ...overrides,
  }
}

describe('computeDashboardStats', () => {
  it('returns zeros for empty input', () => {
    expect(computeDashboardStats([], [], [])).toEqual({
      openProblems: 0,
      lowTanks: 0,
      equipmentInService: 0,
      equipmentTotal: 0,
    })
  })

  it('counts only unresolved problem notes', () => {
    const stats = computeDashboardStats(
      [],
      [],
      [problem({ resolved: false }), problem({ id: '2', resolved: true })]
    )
    expect(stats.openProblems).toBe(1)
  })

  it('counts an in-use tank as low only when its gauge is not green', () => {
    const stats = computeDashboardStats(
      [
        tank({ id: 'a', psi: 200, maxPsi: 2200, status: 'in_use' }), // red
        tank({ id: 'b', psi: 2100, maxPsi: 2200, status: 'in_use' }), // green
      ],
      [],
      []
    )
    expect(stats.lowTanks).toBe(1)
  })

  it('never counts spare or retired tanks as low, even at low psi', () => {
    const stats = computeDashboardStats(
      [
        tank({ id: 'a', psi: 100, maxPsi: 2200, status: 'spare' }),
        tank({ id: 'b', psi: 100, maxPsi: 2200, status: 'retired' }),
      ],
      [],
      []
    )
    expect(stats.lowTanks).toBe(0)
  })

  it('counts in-service equipment and excludes retired items from the total', () => {
    const stats = computeDashboardStats(
      [],
      [
        equipment({ id: 'a', status: 'in_service' }),
        equipment({ id: 'b', status: 'out_of_service' }),
        equipment({ id: 'c', status: 'retired' }),
      ],
      []
    )
    expect(stats.equipmentInService).toBe(1)
    expect(stats.equipmentTotal).toBe(2)
  })
})
