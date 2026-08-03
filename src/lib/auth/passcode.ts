import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEYLEN = 64

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(passcode, salt, KEYLEN).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPasscode(passcode: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(passcode, salt, KEYLEN)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
