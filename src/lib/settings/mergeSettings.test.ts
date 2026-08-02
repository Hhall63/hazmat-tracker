import { describe, it, expect } from 'vitest'
import { mergeSettings } from './mergeSettings'
import { DEFAULT_SETTINGS } from './types'

describe('mergeSettings', () => {
  it('returns defaults for null, arrays, or non-objects', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings([])).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings('x')).toEqual(DEFAULT_SETTINGS)
  })

  it('overlays provided top-level sections over defaults', () => {
    const merged = mergeSettings({ branding: { title: 'Truck 21' } })
    expect(merged.branding.title).toBe('Truck 21')
    expect(merged.branding.subtitle).toBe(DEFAULT_SETTINGS.branding.subtitle)
    expect(merged.headings).toEqual(DEFAULT_SETTINGS.headings)
  })

  it('replaces array sections wholesale when provided', () => {
    const merged = mergeSettings({ layout: { dashboard: [{ key: 'stats', visible: false }] } })
    expect(merged.layout.dashboard).toEqual([{ key: 'stats', visible: false }])
    expect(merged.layout.board).toEqual(DEFAULT_SETTINGS.layout.board)
  })

  it('deep-merges partial nested sub-objects, keeping sibling fields at their defaults', () => {
    const merged = mergeSettings({ scanActions: { tankDefaults: { psi: false } } })
    expect(merged.scanActions.tankDefaults).toEqual({
      psi: false,
      status: true,
      logProblem: true,
      retire: true,
    })
    expect(merged.scanActions.equipmentDefaults).toEqual(DEFAULT_SETTINGS.scanActions.equipmentDefaults)
    expect(merged.scanActions.overrides).toEqual(DEFAULT_SETTINGS.scanActions.overrides)
  })

  it('falls back to the default section when the incoming value is not a plain object', () => {
    expect(mergeSettings({ branding: null }).branding).toEqual(DEFAULT_SETTINGS.branding)
    expect(mergeSettings({ branding: [] }).branding).toEqual(DEFAULT_SETTINGS.branding)
  })

  it('preserves arbitrary scanActions.overrides entries even though the default is {}, while keeping sibling defaults', () => {
    const merged = mergeSettings({ scanActions: { overrides: { tank1: { retire: false } } } })
    expect(merged.scanActions.overrides.tank1).toEqual({ retire: false })
    expect(merged.scanActions.tankDefaults).toEqual(DEFAULT_SETTINGS.scanActions.tankDefaults)
  })
})
