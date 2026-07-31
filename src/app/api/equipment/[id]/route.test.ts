import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { addEquipmentItem } from '@/lib/services/equipmentService'

describe('/api/equipment/[id]', () => {
  it('PATCH updates status and logs the change', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const item = await addEquipmentItem(repo, {
      name: 'SCBA Pack 3',
      category: 'ppe',
      status: 'in_service',
      createdBy: 'J. Smith',
    })

    const request = new NextRequest(`http://localhost/api/equipment/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'out_of_service', updatedBy: 'A. Lee' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await PATCH(request, { params: { id: item.id } })
    const updated = await response.json()
    expect(updated.status).toBe('out_of_service')

    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toContain('status changed from in_service to out_of_service')
  })
})
