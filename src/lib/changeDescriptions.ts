import type { EquipmentItem, EquipmentStatus, Tank, TankStatus } from './types'

export function describeTankPsiChange(tank: Tank, newPsi: number): string {
  return `${tank.gasType} tank (${tank.assignedMeter ?? 'unassigned'}) PSI updated from ${tank.psi} to ${newPsi}`
}

export function describeTankStatusChange(tank: Tank, newStatus: TankStatus): string {
  return `${tank.gasType} tank (${tank.assignedMeter ?? 'unassigned'}) status changed from ${tank.status} to ${newStatus}`
}

export function describeEquipmentStatusChange(item: EquipmentItem, newStatus: EquipmentStatus): string {
  return `${item.name} status changed from ${item.status} to ${newStatus}`
}
