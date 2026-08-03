import { describe, it, expect, afterEach } from 'vitest'
import { POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

afterEach(() => __setRepositoryForTests(null))

describe('POST /api/admin/custom-qr', () => {
  it('creates a code', async () => {
    __setRepositoryForTests(new InMemoryRepository())
    const res = await POST(new Request('http://localhost/api/admin/custom-qr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'SDS', targetUrl: 'https://x.co' }),
    }))
    expect(res.status).toBe(201)
    expect((await res.json()).label).toBe('SDS')
  })

  it('400s on missing url', async () => {
    __setRepositoryForTests(new InMemoryRepository())
    const res = await POST(new Request('http://localhost/api/admin/custom-qr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'SDS' }),
    }))
    expect(res.status).toBe(400)
  })
})
