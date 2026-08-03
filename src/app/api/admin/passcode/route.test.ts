import { describe, it, expect, afterEach } from 'vitest'
import { PUT } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { verifyPasscode } from '@/lib/auth/passcode'

afterEach(() => __setRepositoryForTests(null))

describe('PUT /api/admin/passcode', () => {
  it('stores a hash that verifies against the new passcode', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const res = await PUT(
      new Request('http://localhost/api/admin/passcode', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPasscode: 'brand-new' }),
      })
    )
    expect(res.status).toBe(200)
    const stored = await repo.getAdminPasscodeHash()
    expect(stored && verifyPasscode('brand-new', stored)).toBe(true)
  })
})
