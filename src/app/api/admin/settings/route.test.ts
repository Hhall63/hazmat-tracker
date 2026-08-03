import { describe, it, expect, afterEach } from 'vitest'
import { PUT } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests, getRepository } from '@/lib/repositoryFactory'

afterEach(() => __setRepositoryForTests(null))

function req(body: unknown) {
  return new Request('http://localhost/api/admin/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/admin/settings', () => {
  it('persists a partial update and returns merged settings', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const res = await PUT(req({ branding: { title: 'Engine 21' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.branding.title).toBe('Engine 21')
    expect(await getRepository().getSettings()).not.toBeNull()
  })
})
