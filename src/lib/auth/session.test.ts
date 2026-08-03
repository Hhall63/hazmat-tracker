import { describe, it, expect } from 'vitest'
import { signSessionToken, verifySessionToken } from './session'

const SECRET = 'test-secret'

describe('session tokens', () => {
  it('verifies a freshly signed token', async () => {
    const t = await signSessionToken(SECRET, 1000)
    expect(await verifySessionToken(t, SECRET, 2000)).toBe(true)
  })

  it('rejects a token signed with a different secret', async () => {
    const t = await signSessionToken(SECRET, 1000)
    expect(await verifySessionToken(t, 'other', 2000)).toBe(false)
  })

  it('rejects a tampered payload', async () => {
    const t = await signSessionToken(SECRET, 1000)
    const [, sig] = t.split('.')
    expect(await verifySessionToken(`AAAA.${sig}`, SECRET, 2000)).toBe(false)
  })

  it('rejects an expired token when maxAge is given', async () => {
    const t = await signSessionToken(SECRET, 1000)
    expect(await verifySessionToken(t, SECRET, 1000 + 10, 5)).toBe(false)
  })

  it('rejects malformed tokens', async () => {
    expect(await verifySessionToken('garbage', SECRET, 2000)).toBe(false)
  })
})
