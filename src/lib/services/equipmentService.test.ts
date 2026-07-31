import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from '../repository'
import { addEquipmentItem, applyEquipmentStatusChange } from './equipmentService'

function baseInput() {
  return {
    name: 'SCBA Pack 3',
    category: 'ppe' as const,
    status: 'in_service' as const,
    createdBy: 'J. Smith',
  }
}

describe('addEquipmentItem', () => {
  it('creates an equipment item via the repository', async () => {
    const repo = new InMemoryRepository()
    const item = await addEquipmentItem(repo, baseInput())
    expect(item.name).toBe('SCBA Pack 3')
    expect(await repo.getEquipmentItems()).toEqual([item])
  })
})

describe('applyEquipmentStatusChange', () => {
  it('logs the change and updates the item', async () => {
    const repo = new InMemoryRepository()
    const item = await addEquipmentItem(repo, baseInput())
    const updated = await applyEquipmentStatusChange(repo, item.id, 'out_of_service', 'A. Lee')
    expect(updated.status).toBe('out_of_service')
    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toBe('SCBA Pack 3 status changed from in_service to out_of_service')
    expect(logs[0].entryType).toBe('equipment_status_change')
  })

  it('does not log anything when the status is unchanged', async () => {
    const repo = new InMemoryRepository()
    const item = await addEquipmentItem(repo, baseInput())
    await applyEquipmentStatusChange(repo, item.id, 'in_service', 'A. Lee')
    expect(await repo.getLogEntries()).toHaveLength(0)
  })

  it('throws when the item does not exist', async () => {
    const repo = new InMemoryRepository()
    await expect(
      applyEquipmentStatusChange(repo, 'missing', 'out_of_service', 'A. Lee')
    ).rejects.toThrow('Equipment item not found: missing')
  })
})
