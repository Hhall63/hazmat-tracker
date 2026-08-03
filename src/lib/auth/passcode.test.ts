import { describe, it, expect } from 'vitest'
import { hashPasscode, verifyPasscode } from './passcode'

describe('passcode hashing', () => {
  it('verifies a correct passcode', () => {
    const stored = hashPasscode('redtruck7')
    expect(verifyPasscode('redtruck7', stored)).toBe(true)
  })

  it('rejects an incorrect passcode', () => {
    const stored = hashPasscode('redtruck7')
    expect(verifyPasscode('wrong', stored)).toBe(false)
  })

  it('produces a different salt each time', () => {
    expect(hashPasscode('same')).not.toBe(hashPasscode('same'))
  })

  it('returns false for malformed stored values', () => {
    expect(verifyPasscode('x', 'not-a-valid-format')).toBe(false)
  })
})
