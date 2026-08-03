'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { StatBar } from '@/components/ui/StatBar'
import { ProblemsBanner } from '@/components/ProblemsBanner'
import { TankGauge } from '@/components/TankGauge'
import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES } from '@/lib/types'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useAutoDensity } from '@/hooks/useAutoDensity'
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { EquipmentItem, LogEntry, Tank } from '@/lib/types'

const DENSITY_PADDING: Record<'comfortable' | 'compact' | 'dense', string> = {
  comfortable: 'p-3 text-base',
  compact: 'p-2 text-sm',
  dense: 'p-1.5 text-xs',
}

export default function BoardPage() {
  const [tanks, setTanks] = useState<Tank[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const autoTier = useAutoDensity(containerRef, 1920)
  const settings = useAppSettings()
  const tier = settings.board.densityOverride === 'auto' ? autoTier : settings.board.densityOverride

  const refetchTanks = useCallback(async () => {
    const response = await fetch('/api/tanks')
    setTanks(await response.json())
  }, [])

  const refetchEquipment = useCallback(async () => {
    const response = await fetch('/api/equipment')
    setEquipment(await response.json())
  }, [])

  const refetchLogs = useCallback(async () => {
    const response = await fetch('/api/logs')
    setLogEntries(await response.json())
  }, [])

  useEffect(() => {
    refetchTanks()
    refetchEquipment()
    refetchLogs()
  }, [refetchTanks, refetchEquipment, refetchLogs])

  const client = getSupabaseClient()
  useRealtimeRefetch(client, 'tanks', refetchTanks)
  useRealtimeRefetch(client, 'equipment_items', refetchEquipment)
  useRealtimeRefetch(client, 'log_entries', refetchLogs)

  const latestProblem = logEntries.find((e) => e.entryType === 'problem_note' && !e.resolved) ?? null
  const activeTanks = tanks.filter((t) => t.status === 'in_use')
  const activeEquipment = equipment.filter((e) => e.status !== 'retired')

  const sectionNodes: Record<string, JSX.Element> = {
    stats: <StatBar key="stats" tanks={tanks} equipment={equipment} logEntries={logEntries} />,
    problems: <ProblemsBanner key="problems" latestProblem={latestProblem} />,
    cylinders: (
      <section key="cylinders">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-gold">{settings.headings.cylinders}</h2>
        <div className="grid grid-cols-2 gap-2">
          {activeTanks.map((tank) => (
            <TankGauge key={tank.id} tank={tank} />
          ))}
        </div>
      </section>
    ),
    equipment: (
      <section key="equipment">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-gold">{settings.headings.equipment}</h2>
        {EQUIPMENT_CATEGORIES.map((category) => {
          const items = activeEquipment.filter((i) => i.category === category)
          if (items.length === 0) return null
          return (
            <div key={category} className="mb-2">
              <h3 className="text-[11px] font-semibold text-ink-dim">
                {CATEGORY_LABELS[category]}
              </h3>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-gold/20 bg-panel px-2 py-1"
                >
                  <span>{item.name}</span>
                  <span
                    className={
                      item.status === 'in_service' ? 'text-status-green' : 'text-status-red'
                    }
                  >
                    {item.status === 'in_service' ? 'In Service' : 'Out of Service'}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </section>
    ),
  }

  return (
    <main className="mx-auto h-[1920px] w-[1080px] overflow-hidden bg-bg">
      <div ref={containerRef}>
        <DashboardHeader />
        <div className={`space-y-3 ${DENSITY_PADDING[tier]}`}>
          {settings.layout.board.filter((s) => s.visible).map((s) => sectionNodes[s.key])}
        </div>
      </div>
    </main>
  )
}
