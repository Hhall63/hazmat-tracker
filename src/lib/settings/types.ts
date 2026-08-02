export interface BrandingSettings {
  title: string
  subtitle: string
  tabTitle: string
  badgeImageUrl: string
  emblemImageUrl: string
}

export interface HeadingSettings {
  cylinders: string
  equipment: string
}

export interface SectionConfig {
  key: string
  visible: boolean
}

export const SECTION_KEYS = ['stats', 'problems', 'cylinders', 'equipment'] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

export interface LayoutSettings {
  dashboard: SectionConfig[]
  board: SectionConfig[]
}

export type BoardDensity = 'auto' | 'comfortable' | 'compact' | 'dense'
export interface BoardSettings {
  densityOverride: BoardDensity
}

export interface TankActionFlags {
  psi: boolean
  status: boolean
  logProblem: boolean
  retire: boolean
}

export interface EquipmentActionFlags {
  status: boolean
  logProblem: boolean
  retire: boolean
}

export type ActionFlags = TankActionFlags & EquipmentActionFlags

export interface ScanActionSettings {
  tankDefaults: TankActionFlags
  equipmentDefaults: EquipmentActionFlags
  overrides: Record<string, Partial<ActionFlags>>
}

export interface LabelSettings {
  size: 'small' | 'medium' | 'large'
  showLogo: boolean
  footerText: string
}

export interface AppSettings {
  branding: BrandingSettings
  headings: HeadingSettings
  layout: LayoutSettings
  board: BoardSettings
  scanActions: ScanActionSettings
  labels: LabelSettings
}

const allSectionsVisible = (): SectionConfig[] =>
  SECTION_KEYS.map((key) => ({ key, visible: true }))

export const DEFAULT_SETTINGS: AppSettings = {
  branding: {
    title: 'HAZMAT Inventory',
    subtitle: 'Engine 11 · Ladder 21 · RRT 5',
    tabTitle: 'HAZMAT Inventory Dashboard',
    badgeImageUrl: '/gfd-badge.png',
    emblemImageUrl: '/hazmat-emblem.png',
  },
  headings: {
    cylinders: 'Cylinders',
    equipment: 'Equipment',
  },
  layout: {
    dashboard: allSectionsVisible(),
    board: allSectionsVisible(),
  },
  board: {
    densityOverride: 'auto',
  },
  scanActions: {
    tankDefaults: { psi: true, status: true, logProblem: true, retire: true },
    equipmentDefaults: { status: true, logProblem: true, retire: true },
    overrides: {},
  },
  labels: {
    size: 'medium',
    showLogo: true,
    footerText: '',
  },
}
