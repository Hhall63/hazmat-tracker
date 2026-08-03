import { describe, it, expect, afterEach } from 'vitest'
import { GET } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

afterEach(() => __setRepositoryForTests(null))

describe('GET /api/custom-qr', () => {
  it('lists active codes', async () => {
    const repo = new InMemoryRepository()
    await repo.insertCustomQrCode({ label: 'A', targetUrl: 'https://a.co', createdBy: 'x' })
    __setRepositoryForTests(repo)
    const res = await GET()
    expect((await res.json())).toHaveLength(1)
  })
})
