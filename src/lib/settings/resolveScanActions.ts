import type { AppSettings, TankActionFlags, EquipmentActionFlags } from './types'

export function resolveTankActions(settings: AppSettings, tankId: string): TankActionFlags {
  const override = settings.scanActions.overrides[tankId] ?? {}
  return { ...settings.scanActions.tankDefaults, ...override }
}

export function resolveEquipmentActions(settings: AppSettings, itemId: string): EquipmentActionFlags {
  const override = settings.scanActions.overrides[itemId] ?? {}
  return { ...settings.scanActions.equipmentDefaults, ...override }
}
