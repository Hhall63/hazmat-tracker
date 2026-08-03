import { describe, it, expect } from 'vitest'
import { resolveTankActions, resolveEquipmentActions } from './resolveScanActions'
import { DEFAULT_SETTINGS } from './types'

describe('resolveScanActions', () => {
  it('returns type defaults when no override', () => {
    expect(resolveTankActions(DEFAULT_SETTINGS, 't1')).toEqual(DEFAULT_SETTINGS.scanActions.tankDefaults)
  })

  it('applies a per-item override over the default', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      scanActions: { ...DEFAULT_SETTINGS.scanActions, overrides: { t1: { retire: false } } },
    }
    expect(resolveTankActions(s, 't1').retire).toBe(false)
    expect(resolveTankActions(s, 't1').psi).toBe(true)
    expect(resolveEquipmentActions(s, 't1').retire).toBe(false)
  })
})
