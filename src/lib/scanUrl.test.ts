import { describe, it, expect } from 'vitest'
import { tankScanPath, equipmentScanPath, problemScanPath, toAbsoluteUrl } from './scanUrl'

describe('scanUrl', () => {
  it('builds a tank scan path from an id', () => {
    expect(tankScanPath('abc-123')).toBe('/scan/tank/abc-123')
  })

  it('builds an equipment scan path from an id', () => {
    expect(equipmentScanPath('xyz-789')).toBe('/scan/equipment/xyz-789')
  })

  it('returns the fixed generic problem scan path', () => {
    expect(problemScanPath()).toBe('/scan/problem')
  })

  it('joins an origin and a path into an absolute URL', () => {
    expect(toAbsoluteUrl('/scan/tank/abc-123', 'https://hazmat-tracker.vercel.app')).toBe(
      'https://hazmat-tracker.vercel.app/scan/tank/abc-123'
    )
  })

  it('strips a trailing slash from the origin before joining', () => {
    expect(toAbsoluteUrl('/scan/problem', 'https://hazmat-tracker.vercel.app/')).toBe(
      'https://hazmat-tracker.vercel.app/scan/problem'
    )
  })
})
