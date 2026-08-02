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
})
