import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

describe('/api/logs', () => {
  beforeEach(() => {
    __setRepositoryForTests(new InMemoryRepository())
  })

  it('POST creates a problem note and GET lists it', async () => {
    const postRequest = new NextRequest('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify({ description: 'Decon pump leaking', createdBy: 'J. Smith' }),
      headers: { 'content-type': 'application/json' },
    })

    const postResponse = await POST(postRequest)
    expect(postResponse.status).toBe(201)
    const created = await postResponse.json()
    expect(created.entryType).toBe('problem_note')
    expect(created.resolved).toBe(false)

    const getResponse = await GET()
    const entries = await getResponse.json()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe(created.id)
  })
})
