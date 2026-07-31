import type { Repository } from '../repository'
import type { EquipmentItem, EquipmentStatus, NewEquipmentInput } from '../types'
import { describeEquipmentStatusChange } from '../changeDescriptions'

export async function addEquipmentItem(
  repo: Repository,
  input: NewEquipmentInput
): Promise<EquipmentItem> {
  return repo.insertEquipmentItem(input)
}

export async function applyEquipmentStatusChange(
  repo: Repository,
  id: string,
  status: EquipmentStatus,
  updatedBy: string
): Promise<EquipmentItem> {
  const existing = await repo.getEquipmentItem(id)
  if (!existing) throw new Error(`Equipment item not found: ${id}`)

  if (status !== existing.status) {
    await repo.insertLogEntry({
      createdBy: updatedBy,
      entryType: 'equipment_status_change',
      description: describeEquipmentStatusChange(existing, status),
    })
  }

  return repo.updateEquipmentItem(id, { status }, updatedBy)
}
