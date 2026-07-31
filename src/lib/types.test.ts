import { describe, it, expect } from 'vitest'
import {
  TANK_STATUSES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  LOG_ENTRY_TYPES,
} from './types'

describe('shared enums', () => {
  it('defines the three tank statuses', () => {
    expect(TANK_STATUSES).toEqual(['in_use', 'spare', 'retired'])
  })

  it('defines the three equipment categories', () => {
    expect(EQUIPMENT_CATEGORIES).toEqual(['meter_detector', 'ppe', 'tools_misc'])
  })

  it('defines the three equipment statuses', () => {
    expect(EQUIPMENT_STATUSES).toEqual(['in_service', 'out_of_service', 'retired'])
  })

  it('defines the three log entry types', () => {
    expect(LOG_ENTRY_TYPES).toEqual(['tank_update', 'equipment_status_change', 'problem_note'])
  })
})
