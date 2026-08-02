import type { SupabaseClient } from '@supabase/supabase-js'
import type { Repository } from './repository'
import type {
  EquipmentItem,
  LogEntry,
  NewEquipmentInput,
  NewLogEntryInput,
  NewTankInput,
  Tank,
} from './types'
import type { AppSettings } from './settings/types'
import { getSupabaseClient } from './supabaseClient'

export function mapRowToTank(row: any): Tank {
  return {
    id: row.id,
    gasType: row.gas_type,
    assignedMeter: row.assigned_meter,
    psi: row.psi,
    maxPsi: row.max_psi,
    status: row.status,
    lastUpdatedBy: row.last_updated_by,
    lastUpdatedAt: row.last_updated_at,
  }
}

export function mapRowToEquipmentItem(row: any): EquipmentItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    lastUpdatedBy: row.last_updated_by,
    lastUpdatedAt: row.last_updated_at,
  }
}

export function mapRowToLogEntry(row: any): LogEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    entryType: row.entry_type,
    description: row.description,
    resolved: row.resolved,
  }
}

export class SupabaseRepository implements Repository {
  private client: SupabaseClient

  constructor(client: SupabaseClient = getSupabaseClient()) {
    this.client = client
  }

  async getTanks(): Promise<Tank[]> {
    const { data, error } = await this.client.from('tanks').select('*').order('gas_type')
    if (error) throw error
    return (data ?? []).map(mapRowToTank)
  }

  async getTank(id: string): Promise<Tank | null> {
    const { data, error } = await this.client.from('tanks').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? mapRowToTank(data) : null
  }

  async insertTank(input: NewTankInput): Promise<Tank> {
    const { data, error } = await this.client
      .from('tanks')
      .insert({
        gas_type: input.gasType,
        assigned_meter: input.assignedMeter,
        psi: input.psi,
        max_psi: input.maxPsi,
        status: input.status,
        last_updated_by: input.createdBy,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapRowToTank(data)
  }

  async updateTank(
    id: string,
    changes: Partial<Pick<Tank, 'psi' | 'status' | 'gasType' | 'assignedMeter'>>,
    updatedBy: string
  ): Promise<Tank> {
    const { data, error } = await this.client
      .from('tanks')
      .update({
        ...(changes.psi !== undefined ? { psi: changes.psi } : {}),
        ...(changes.status !== undefined ? { status: changes.status } : {}),
        ...(changes.gasType !== undefined ? { gas_type: changes.gasType } : {}),
        ...(changes.assignedMeter !== undefined ? { assigned_meter: changes.assignedMeter } : {}),
        last_updated_by: updatedBy,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapRowToTank(data)
  }

  async getEquipmentItems(): Promise<EquipmentItem[]> {
    const { data, error } = await this.client.from('equipment_items').select('*').order('name')
    if (error) throw error
    return (data ?? []).map(mapRowToEquipmentItem)
  }

  async getEquipmentItem(id: string): Promise<EquipmentItem | null> {
    const { data, error } = await this.client
      .from('equipment_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? mapRowToEquipmentItem(data) : null
  }

  async insertEquipmentItem(input: NewEquipmentInput): Promise<EquipmentItem> {
    const { data, error } = await this.client
      .from('equipment_items')
      .insert({
        name: input.name,
        category: input.category,
        status: input.status,
        last_updated_by: input.createdBy,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapRowToEquipmentItem(data)
  }

  async updateEquipmentItem(
    id: string,
    changes: Partial<Pick<EquipmentItem, 'status' | 'name' | 'category'>>,
    updatedBy: string
  ): Promise<EquipmentItem> {
    const { data, error } = await this.client
      .from('equipment_items')
      .update({
        ...(changes.status !== undefined ? { status: changes.status } : {}),
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.category !== undefined ? { category: changes.category } : {}),
        last_updated_by: updatedBy,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapRowToEquipmentItem(data)
  }

  async getLogEntries(): Promise<LogEntry[]> {
    const { data, error } = await this.client
      .from('log_entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapRowToLogEntry)
  }

  async insertLogEntry(input: NewLogEntryInput): Promise<LogEntry> {
    const { data, error } = await this.client
      .from('log_entries')
      .insert({
        created_by: input.createdBy,
        entry_type: input.entryType,
        description: input.description,
        resolved: input.entryType === 'problem_note' ? false : null,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapRowToLogEntry(data)
  }

  async resolveLogEntry(id: string): Promise<LogEntry> {
    const { data, error } = await this.client
      .from('log_entries')
      .update({ resolved: true })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapRowToLogEntry(data)
  }

  async getSettings(): Promise<unknown | null> {
    const { data, error } = await this.client
      .from('app_settings')
      .select('config')
      .eq('id', 'singleton')
      .maybeSingle()
    if (error) throw error
    return data?.config ?? null
  }

  async saveSettings(config: AppSettings, updatedBy: string): Promise<void> {
    const { error } = await this.client
      .from('app_settings')
      .upsert({
        id: 'singleton',
        config,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      })
    if (error) throw error
  }
}
