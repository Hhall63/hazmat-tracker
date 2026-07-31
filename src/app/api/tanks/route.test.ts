import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

describe('/api/tanks', () => {
  beforeEach(() => {
    __setRepositoryForTests(new InMemoryRepository())
  })

  it('POST creates a tank and GET lists it', async () => {
    const postRequest = new NextRequest('http://localhost/api/tanks', {
      method: 'POST',
      body: JSON.stringify({
        gasType: 'Methane',
        assignedMeter: 'Meter 1',
        psi: 2200,
        maxPsi: 2216,
        status: 'in_use',
        createdBy: 'J. Smith',
      }),
      headers: { 'content-type': 'application/json' },
    })

    const postResponse = await POST(postRequest)
    expect(postResponse.status).toBe(201)
    const created = await postResponse.json()
    expect(created.gasType).toBe('Methane')

    const getResponse = await GET()
    const tanks = await getResponse.json()
    expect(tanks).toHaveLength(1)
    expect(tanks[0].id).toBe(created.id)
  })
})
