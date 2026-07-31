import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from '../repository'
import { addTank, applyTankUpdate } from './tankService'

function baseInput() {
  return {
    gasType: 'Methane',
    assignedMeter: 'Meter 1',
    psi: 2200,
    maxPsi: 2216,
    status: 'in_use' as const,
    createdBy: 'J. Smith',
  }
}

describe('addTank', () => {
  it('creates a tank via the repository', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    expect(tank.gasType).toBe('Methane')
    expect(await repo.getTanks()).toEqual([tank])
  })
})

describe('applyTankUpdate', () => {
  it('logs a PSI change and updates the tank', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    const updated = await applyTankUpdate(repo, tank.id, { psi: 1800 }, 'A. Lee')
    expect(updated.psi).toBe(1800)
    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toBe('Methane tank (Meter 1) PSI updated from 2200 to 1800')
    expect(logs[0].entryType).toBe('tank_update')
  })

  it('logs a status change and updates the tank', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    await applyTankUpdate(repo, tank.id, { status: 'spare' }, 'A. Lee')
    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toBe('Methane tank (Meter 1) status changed from in_use to spare')
  })

  it('logs both changes when PSI and status change together', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    await applyTankUpdate(repo, tank.id, { psi: 1800, status: 'spare' }, 'A. Lee')
    expect(await repo.getLogEntries()).toHaveLength(2)
  })

  it('does not log anything when nothing actually changed', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    await applyTankUpdate(repo, tank.id, { psi: 2200 }, 'A. Lee')
    expect(await repo.getLogEntries()).toHaveLength(0)
  })

  it('throws when the tank does not exist', async () => {
    const repo = new InMemoryRepository()
    await expect(applyTankUpdate(repo, 'missing', { psi: 1 }, 'A. Lee')).rejects.toThrow(
      'Tank not found: missing'
    )
  })
})
