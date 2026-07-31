import { describe, it, expect } from 'vitest'
import { PATCH } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { addProblemNote } from '@/lib/services/logService'

describe('/api/logs/[id]', () => {
  it('PATCH marks a problem note resolved', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const entry = await addProblemNote(repo, 'Decon pump leaking', 'J. Smith')

    const response = await PATCH(new Request(`http://localhost/api/logs/${entry.id}`, { method: 'PATCH' }), {
      params: { id: entry.id },
    })
    const updated = await response.json()
    expect(updated.resolved).toBe(true)
  })
})
