import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'
import { signSessionToken } from '@/lib/auth/session'

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
})

function get(path: string, cookie?: string) {
  const url = `http://localhost${path}`
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  return new NextRequest(url, { headers })
}

describe('admin middleware', () => {
  it('redirects unauthenticated /admin to /admin/login', async () => {
    const res = await middleware(get('/admin/branding'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin/login')
  })

  it('401s unauthenticated /api/admin requests', async () => {
    const res = await middleware(get('/api/admin/settings'))
    expect(res.status).toBe(401)
  })

  it('allows /admin/login through', async () => {
    const res = await middleware(get('/admin/login'))
    expect(res.status).toBe(200) // NextResponse.next()
  })

  it('allows an authenticated request through', async () => {
    const token = await signSessionToken('test-secret', Date.now())
    const res = await middleware(get('/admin/branding', `hazmat_admin=${token}`))
    expect(res.status).toBe(200)
  })

  it('fails closed (denies without throwing) when ADMIN_SESSION_SECRET is unset', async () => {
    // With a token cookie present but the secret env missing, the gate must deny
    // cleanly. Without the `secret &&` short-circuit, verifySessionToken would be
    // called with an empty key and THROW ("zero-length key"), so this also guards
    // that the fix short-circuits before touching crypto.
    const token = await signSessionToken('test-secret', Date.now())
    delete process.env.ADMIN_SESSION_SECRET
    const res = await middleware(get('/admin/branding', `hazmat_admin=${token}`))
    expect(res.status).toBe(307) // redirected to login, NOT allowed through, no throw
    expect(res.headers.get('location')).toContain('/admin/login')
  })
})
