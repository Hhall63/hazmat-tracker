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

  it('returns false (never throws) for malformed stored values', () => {
    // These attacker-controllable shapes must all resolve to false without throwing,
    // so verifyPasscode is total on any string input.
    expect(verifyPasscode('x', 'not-a-valid-format')).toBe(false) // no colon
    expect(verifyPasscode('x', '')).toBe(false) // empty
    expect(verifyPasscode('x', 'abc:zzzz')).toBe(false) // non-hex hash → 0-byte buffer, length mismatch
    expect(verifyPasscode('x', 'a:b:c')).toBe(false) // extra colons → short buffer
    expect(verifyPasscode('x', ':')).toBe(false) // empty salt and hash
  })
})
