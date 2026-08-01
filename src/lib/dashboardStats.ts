import { gaugeColor } from './gauge'
import type { EquipmentItem, LogEntry, Tank } from './types'

export interface DashboardStats {
  openProblems: number
  lowTanks: number
  equipmentInService: number
  equipmentTotal: number
}

export function computeDashboardStats(
  tanks: Tank[],
  equipment: EquipmentItem[],
  logEntries: LogEntry[]
): DashboardStats {
  const openProblems = logEntries.filter(
    (e) => e.entryType === 'problem_note' && !e.resolved
  ).length

  const lowTanks = tanks.filter(
    (t) => t.status === 'in_use' && gaugeColor(t.psi, t.maxPsi) !== 'green'
  ).length

  const activeEquipment = equipment.filter((e) => e.status !== 'retired')
  const equipmentInService = activeEquipment.filter((e) => e.status === 'in_service').length

  return {
    openProblems,
    lowTanks,
    equipmentInService,
    equipmentTotal: activeEquipment.length,
  }
}
