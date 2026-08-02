import { describe, it, expect, afterEach } from 'vitest'
import { GET } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

afterEach(() => __setRepositoryForTests(null))

describe('GET /api/settings', () => {
  it('returns default settings when nothing stored', async () => {
    __setRepositoryForTests(new InMemoryRepository())
    const res = await GET()
    expect(await res.json()).toEqual(DEFAULT_SETTINGS)
  })
})
