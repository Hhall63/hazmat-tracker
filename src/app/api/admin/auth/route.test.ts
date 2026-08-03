import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { hashPasscode } from '@/lib/auth/passcode'

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
})
afterEach(() => __setRepositoryForTests(null))

function req(body: unknown) {
  return new Request('http://localhost/api/admin/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/auth', () => {
  it('sets a cookie for the correct passcode', async () => {
    const repo = new InMemoryRepository()
    await repo.setAdminPasscodeHash(hashPasscode('open-sesame'))
    __setRepositoryForTests(repo)
    const res = await POST(req({ passcode: 'open-sesame' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('hazmat_admin=')
  })

  it('rejects a wrong passcode with 401 and no cookie', async () => {
    const repo = new InMemoryRepository()
    await repo.setAdminPasscodeHash(hashPasscode('open-sesame'))
    __setRepositoryForTests(repo)
    const res = await POST(req({ passcode: 'nope' }))
    expect(res.status).toBe(401)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('rejects when no passcode has been configured', async () => {
    __setRepositoryForTests(new InMemoryRepository())
    const res = await POST(req({ passcode: 'anything' }))
    expect(res.status).toBe(401)
  })
})
