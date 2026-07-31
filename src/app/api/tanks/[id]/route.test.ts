import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { addTank } from '@/lib/services/tankService'

describe('/api/tanks/[id]', () => {
  it('PATCH updates psi and logs the change', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const tank = await addTank(repo, {
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      createdBy: 'J. Smith',
    })

    const request = new NextRequest(`http://localhost/api/tanks/${tank.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ psi: 1800, updatedBy: 'A. Lee' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await PATCH(request, { params: { id: tank.id } })
    const updated = await response.json()
    expect(updated.psi).toBe(1800)

    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toContain('PSI updated from 2200 to 1800')
  })
})
