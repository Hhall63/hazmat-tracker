import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

describe('/api/equipment', () => {
  beforeEach(() => {
    __setRepositoryForTests(new InMemoryRepository())
  })

  it('POST creates an equipment item and GET lists it', async () => {
    const postRequest = new NextRequest('http://localhost/api/equipment', {
      method: 'POST',
      body: JSON.stringify({
        name: 'SCBA Pack 3',
        category: 'ppe',
        status: 'in_service',
        createdBy: 'J. Smith',
      }),
      headers: { 'content-type': 'application/json' },
    })

    const postResponse = await POST(postRequest)
    expect(postResponse.status).toBe(201)
    const created = await postResponse.json()
    expect(created.name).toBe('SCBA Pack 3')

    const getResponse = await GET()
    const items = await getResponse.json()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(created.id)
  })
})
