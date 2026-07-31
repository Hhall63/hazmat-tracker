export const TANK_STATUSES = ['in_use', 'spare', 'retired'] as const
export type TankStatus = (typeof TANK_STATUSES)[number]

export const EQUIPMENT_CATEGORIES = ['meter_detector', 'ppe', 'tools_misc'] as const
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]

export const EQUIPMENT_STATUSES = ['in_service', 'out_of_service', 'retired'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

export const LOG_ENTRY_TYPES = ['tank_update', 'equipment_status_change', 'problem_note'] as const
export type LogEntryType = (typeof LOG_ENTRY_TYPES)[number]

export interface Tank {
  id: string
  gasType: string
  assignedMeter: string | null
  psi: number
  maxPsi: number
  status: TankStatus
  lastUpdatedBy: string
  lastUpdatedAt: string
}

export interface NewTankInput {
  gasType: string
  assignedMeter: string | null
  psi: number
  maxPsi: number
  status: TankStatus
  createdBy: string
}

export interface EquipmentItem {
  id: string
  name: string
  category: EquipmentCategory
  status: EquipmentStatus
  lastUpdatedBy: string
  lastUpdatedAt: string
}

export interface NewEquipmentInput {
  name: string
  category: EquipmentCategory
  status: EquipmentStatus
  createdBy: string
}

export interface LogEntry {
  id: string
  createdAt: string
  createdBy: string
  entryType: LogEntryType
  description: string
  resolved: boolean | null
}

export interface NewLogEntryInput {
  createdBy: string
  entryType: LogEntryType
  description: string
}
