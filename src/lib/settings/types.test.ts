import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, SECTION_KEYS } from './types'

describe('DEFAULT_SETTINGS', () => {
  it('matches the current hardcoded values exactly', () => {
    expect(DEFAULT_SETTINGS.branding.title).toBe('HAZMAT Inventory')
    expect(DEFAULT_SETTINGS.branding.subtitle).toBe('Engine 11 · Ladder 21 · RRT 5')
    expect(DEFAULT_SETTINGS.branding.tabTitle).toBe('HAZMAT Inventory Dashboard')
    expect(DEFAULT_SETTINGS.branding.badgeImageUrl).toBe('/gfd-badge.png')
    expect(DEFAULT_SETTINGS.branding.emblemImageUrl).toBe('/hazmat-emblem.png')
    expect(DEFAULT_SETTINGS.headings.cylinders).toBe('Cylinders')
    expect(DEFAULT_SETTINGS.headings.equipment).toBe('Equipment')
  })

  it('defaults every section visible and in canonical order', () => {
    expect(DEFAULT_SETTINGS.layout.dashboard.map((s) => s.key)).toEqual(SECTION_KEYS)
    expect(DEFAULT_SETTINGS.layout.dashboard.every((s) => s.visible)).toBe(true)
    expect(DEFAULT_SETTINGS.layout.board.map((s) => s.key)).toEqual(SECTION_KEYS)
  })

  it('defaults all scan actions enabled and board density auto', () => {
    expect(DEFAULT_SETTINGS.scanActions.tankDefaults).toEqual({
      psi: true, status: true, logProblem: true, retire: true,
    })
    expect(DEFAULT_SETTINGS.scanActions.equipmentDefaults).toEqual({
      status: true, logProblem: true, retire: true,
    })
    expect(DEFAULT_SETTINGS.scanActions.overrides).toEqual({})
    expect(DEFAULT_SETTINGS.board.densityOverride).toBe('auto')
  })
})
