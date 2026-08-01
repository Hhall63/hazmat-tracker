import { describe, it, expect } from 'vitest'
import { chooseDensityTier, DENSITY_TIERS } from './densityTier'

describe('chooseDensityTier', () => {
  it('returns null when content already fits at the current tier', () => {
    expect(chooseDensityTier(1000, 1920, 'comfortable')).toBeNull()
  })

  it('steps to the next denser tier when content overflows', () => {
    expect(chooseDensityTier(2200, 1920, 'comfortable')).toBe('compact')
    expect(chooseDensityTier(2200, 1920, 'compact')).toBe('dense')
  })

  it('returns null when already at the densest tier, even if still overflowing', () => {
    expect(chooseDensityTier(5000, 1920, 'dense')).toBeNull()
  })

  it('exposes the ordered tier list', () => {
    expect(DENSITY_TIERS).toEqual(['comfortable', 'compact', 'dense'])
  })
})
