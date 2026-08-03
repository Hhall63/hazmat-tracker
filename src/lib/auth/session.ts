const enc = new TextEncoder()

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64url(sig)
}

export async function signSessionToken(secret: string, issuedAtMs: number): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ iat: issuedAtMs })))
  const sig = await hmac(secret, payload)
  return `${payload}.${sig}`
}

export async function verifySessionToken(
  token: string,
  secret: string,
  nowMs: number,
  maxAgeMs?: number
): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  const expected = await hmac(secret, payload)
  if (sig !== expected) return false
  if (maxAgeMs !== undefined) {
    try {
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      if (typeof json.iat !== 'number' || nowMs - json.iat > maxAgeMs) return false
    } catch {
      return false
    }
  }
  return true
}
