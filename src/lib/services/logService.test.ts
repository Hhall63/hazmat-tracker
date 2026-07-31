import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from '../repository'
import { addProblemNote, resolveProblemNote } from './logService'

describe('addProblemNote', () => {
  it('creates an unresolved problem_note entry', async () => {
    const repo = new InMemoryRepository()
    const entry = await addProblemNote(repo, 'Decon pump leaking', 'J. Smith')
    expect(entry.entryType).toBe('problem_note')
    expect(entry.resolved).toBe(false)
    expect(entry.description).toBe('Decon pump leaking')
  })
})

describe('resolveProblemNote', () => {
  it('marks a problem note resolved', async () => {
    const repo = new InMemoryRepository()
    const entry = await addProblemNote(repo, 'Decon pump leaking', 'J. Smith')
    const resolved = await resolveProblemNote(repo, entry.id)
    expect(resolved.resolved).toBe(true)
  })

  it('throws when the entry does not exist', async () => {
    const repo = new InMemoryRepository()
    await expect(resolveProblemNote(repo, 'missing')).rejects.toThrow('Log entry not found: missing')
  })
})
