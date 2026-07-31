import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from './repository'

describe('InMemoryRepository', () => {
  it('inserts and lists tanks', async () => {
    const repo = new InMemoryRepository()
    const tank = await repo.insertTank({
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      createdBy: 'J. Smith',
    })
    expect(tank.id).toBeTruthy()
    expect(await repo.getTanks()).toEqual([tank])
  })

  it('updates a tank and stamps who/when', async () => {
    const repo = new InMemoryRepository()
    const tank = await repo.insertTank({
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      createdBy: 'J. Smith',
    })
    const updated = await repo.updateTank(tank.id, { psi: 1800 }, 'A. Lee')
    expect(updated.psi).toBe(1800)
    expect(updated.lastUpdatedBy).toBe('A. Lee')
  })

  it('throws when updating a tank that does not exist', async () => {
    const repo = new InMemoryRepository()
    await expect(repo.updateTank('missing', { psi: 1 }, 'A. Lee')).rejects.toThrow(
      'Tank not found: missing'
    )
  })

  it('inserts and updates equipment items', async () => {
    const repo = new InMemoryRepository()
    const item = await repo.insertEquipmentItem({
      name: 'SCBA Pack 3',
      category: 'ppe',
      status: 'in_service',
      createdBy: 'J. Smith',
    })
    const updated = await repo.updateEquipmentItem(item.id, { status: 'out_of_service' }, 'A. Lee')
    expect(updated.status).toBe('out_of_service')
    expect(updated.lastUpdatedBy).toBe('A. Lee')
  })

  it('sets resolved=false for new problem notes and null for other log types', async () => {
    const repo = new InMemoryRepository()
    const problem = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
    })
    const update = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'tank_update',
      description: 'Methane tank PSI updated from 2200 to 1800',
    })
    expect(problem.resolved).toBe(false)
    expect(update.resolved).toBeNull()
  })

  it('resolves a problem note', async () => {
    const repo = new InMemoryRepository()
    const problem = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
    })
    const resolved = await repo.resolveLogEntry(problem.id)
    expect(resolved.resolved).toBe(true)
  })

  it('lists log entries newest first', async () => {
    const repo = new InMemoryRepository()
    const first = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'first',
    })
    const second = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'second',
    })
    expect((await repo.getLogEntries()).map((e) => e.id)).toEqual([second.id, first.id])
  })

  it('orders log entries by insertion order even when createdAt timestamps collide', async () => {
    const repo = new InMemoryRepository()
    const first = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'first',
    })
    const second = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'second',
    })
    const third = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'third',
    })
    // Force identical createdAt timestamps to simulate same-millisecond inserts,
    // which previously broke ties in the wrong direction (oldest-first) when
    // getLogEntries() sorted by comparing createdAt strings.
    const sameTimestamp = first.createdAt
    second.createdAt = sameTimestamp
    third.createdAt = sameTimestamp

    expect((await repo.getLogEntries()).map((e) => e.id)).toEqual([third.id, second.id, first.id])
  })
})
