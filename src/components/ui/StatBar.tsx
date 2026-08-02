import { computeDashboardStats } from '@/lib/dashboardStats'
import type { EquipmentItem, LogEntry, Tank } from '@/lib/types'
import { StatTile } from './StatTile'

export function StatBar({
  tanks,
  equipment,
  logEntries,
}: {
  tanks: Tank[]
  equipment: EquipmentItem[]
  logEntries: LogEntry[]
}) {
  const stats = computeDashboardStats(tanks, equipment, logEntries)
  return (
    <div className="grid grid-cols-3 gap-2" data-testid="stat-bar">
      <StatTile
        value={stats.openProblems}
        label="Open Problems"
        tone={stats.openProblems > 0 ? 'bad' : 'ok'}
      />
      <StatTile
        value={stats.lowTanks}
        label="Tanks Low"
        tone={stats.lowTanks > 0 ? 'warn' : 'ok'}
      />
      <StatTile
        value={stats.equipmentInService}
        label="Equipment In Service"
        tone={stats.equipmentInService > 0 ? 'ok' : 'bad'}
      />
    </div>
  )
}
