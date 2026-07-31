import type {
  EquipmentItem,
  LogEntry,
  NewEquipmentInput,
  NewLogEntryInput,
  NewTankInput,
  Tank,
} from './types'

export interface Repository {
  getTanks(): Promise<Tank[]>
  getTank(id: string): Promise<Tank | null>
  insertTank(input: NewTankInput): Promise<Tank>
  updateTank(
    id: string,
    changes: Partial<Pick<Tank, 'psi' | 'status' | 'gasType' | 'assignedMeter'>>,
    updatedBy: string
  ): Promise<Tank>

  getEquipmentItems(): Promise<EquipmentItem[]>
  getEquipmentItem(id: string): Promise<EquipmentItem | null>
  insertEquipmentItem(input: NewEquipmentInput): Promise<EquipmentItem>
  updateEquipmentItem(
    id: string,
    changes: Partial<Pick<EquipmentItem, 'status' | 'name' | 'category'>>,
    updatedBy: string
  ): Promise<EquipmentItem>

  getLogEntries(): Promise<LogEntry[]>
  insertLogEntry(input: NewLogEntryInput): Promise<LogEntry>
  resolveLogEntry(id: string): Promise<LogEntry>
}

export class InMemoryRepository implements Repository {
  private tanks: Tank[] = []
  private equipmentItems: EquipmentItem[] = []
  private logEntries: LogEntry[] = []

  async getTanks(): Promise<Tank[]> {
    return [...this.tanks]
  }

  async getTank(id: string): Promise<Tank | null> {
    return this.tanks.find((t) => t.id === id) ?? null
  }

  async insertTank(input: NewTankInput): Promise<Tank> {
    const tank: Tank = {
      id: crypto.randomUUID(),
      gasType: input.gasType,
      assignedMeter: input.assignedMeter,
      psi: input.psi,
      maxPsi: input.maxPsi,
      status: input.status,
      lastUpdatedBy: input.createdBy,
      lastUpdatedAt: new Date().toISOString(),
    }
    this.tanks.push(tank)
    return tank
  }

  async updateTank(
    id: string,
    changes: Partial<Pick<Tank, 'psi' | 'status' | 'gasType' | 'assignedMeter'>>,
    updatedBy: string
  ): Promise<Tank> {
    const existing = await this.getTank(id)
    if (!existing) throw new Error(`Tank not found: ${id}`)
    const updated: Tank = {
      ...existing,
      ...changes,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date().toISOString(),
    }
    this.tanks = this.tanks.map((t) => (t.id === id ? updated : t))
    return updated
  }

  async getEquipmentItems(): Promise<EquipmentItem[]> {
    return [...this.equipmentItems]
  }

  async getEquipmentItem(id: string): Promise<EquipmentItem | null> {
    return this.equipmentItems.find((e) => e.id === id) ?? null
  }

  async insertEquipmentItem(input: NewEquipmentInput): Promise<EquipmentItem> {
    const item: EquipmentItem = {
      id: crypto.randomUUID(),
      name: input.name,
      category: input.category,
      status: input.status,
      lastUpdatedBy: input.createdBy,
      lastUpdatedAt: new Date().toISOString(),
    }
    this.equipmentItems.push(item)
    return item
  }

  async updateEquipmentItem(
    id: string,
    changes: Partial<Pick<EquipmentItem, 'status' | 'name' | 'category'>>,
    updatedBy: string
  ): Promise<EquipmentItem> {
    const existing = await this.getEquipmentItem(id)
    if (!existing) throw new Error(`Equipment item not found: ${id}`)
    const updated: EquipmentItem = {
      ...existing,
      ...changes,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date().toISOString(),
    }
    this.equipmentItems = this.equipmentItems.map((e) => (e.id === id ? updated : e))
    return updated
  }

  async getLogEntries(): Promise<LogEntry[]> {
    return [...this.logEntries].reverse()
  }

  async insertLogEntry(input: NewLogEntryInput): Promise<LogEntry> {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      entryType: input.entryType,
      description: input.description,
      resolved: input.entryType === 'problem_note' ? false : null,
    }
    this.logEntries.push(entry)
    return entry
  }

  async resolveLogEntry(id: string): Promise<LogEntry> {
    const existing = this.logEntries.find((e) => e.id === id)
    if (!existing) throw new Error(`Log entry not found: ${id}`)
    const updated: LogEntry = { ...existing, resolved: true }
    this.logEntries = this.logEntries.map((e) => (e.id === id ? updated : e))
    return updated
  }
}
