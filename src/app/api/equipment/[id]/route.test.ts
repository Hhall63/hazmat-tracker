import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from './route'
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

  it('GET returns the equipment item when it exists', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const item = await repo.insertEquipmentItem({
      name: 'SCBA Pack #3',
      category: 'meter_detector',
      status: 'in_service',
      createdBy: 'J. Smith',
    })

    const response = await GET(new NextRequest(`http://localhost/api/equipment/${item.id}`), {
      params: { id: item.id },
    })
    expect(response.status).toBe(200)
    const found = await response.json()
    expect(found.id).toBe(item.id)
  })

  it('GET returns 404 when the equipment item does not exist', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)

    const response = await GET(new NextRequest('http://localhost/api/equipment/nonexistent'), {
      params: { id: 'nonexistent' },
    })
    expect(response.status).toBe(404)
  })
})
