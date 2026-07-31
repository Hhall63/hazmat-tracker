import type { Repository } from '../repository'
import type { NewTankInput, Tank, TankStatus } from '../types'
import { describeTankPsiChange, describeTankStatusChange } from '../changeDescriptions'

export async function addTank(repo: Repository, input: NewTankInput): Promise<Tank> {
  return repo.insertTank(input)
}

export interface TankUpdateChanges {
  psi?: number
  status?: TankStatus
}

export async function applyTankUpdate(
  repo: Repository,
  id: string,
  changes: TankUpdateChanges,
  updatedBy: string
): Promise<Tank> {
  const existing = await repo.getTank(id)
  if (!existing) throw new Error(`Tank not found: ${id}`)

  if (changes.psi !== undefined && changes.psi !== existing.psi) {
    await repo.insertLogEntry({
      createdBy: updatedBy,
      entryType: 'tank_update',
      description: describeTankPsiChange(existing, changes.psi),
    })
  }

  if (changes.status !== undefined && changes.status !== existing.status) {
    await repo.insertLogEntry({
      createdBy: updatedBy,
      entryType: 'tank_update',
      description: describeTankStatusChange(existing, changes.status),
    })
  }

  return repo.updateTank(id, changes, updatedBy)
}
