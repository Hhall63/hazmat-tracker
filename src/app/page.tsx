'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { StatBar } from '@/components/ui/StatBar'
import { TankSection } from '@/components/TankSection'
import { EquipmentSection } from '@/components/EquipmentSection'
import { ProblemsBanner } from '@/components/ProblemsBanner'
import { useLocalName } from '@/hooks/useLocalName'
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { EquipmentItem, LogEntry, Tank } from '@/lib/types'

export default function DashboardPage() {
  const [tanks, setTanks] = useState<Tank[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [name, setName] = useLocalName()

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

  return (
    <div className="min-h-screen">
      <DashboardHeader subtitle="Engine 11 · Ladder 21 · RRT 5" />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <label className="block text-sm text-ink-dim">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-gold/20 bg-panel px-2 py-1 text-ink"
          />
        </label>
        <StatBar tanks={tanks} equipment={equipment} logEntries={logEntries} />
        <ProblemsBanner latestProblem={latestProblem} />
        <div className="grid gap-6 md:grid-cols-2">
          <TankSection tanks={tanks} updatedBy={name} onChanged={refetchTanks} />
          <EquipmentSection items={equipment} updatedBy={name} onChanged={refetchEquipment} />
        </div>
        <div className="flex gap-4 text-sm">
          <a href="/log" className="text-gold underline">
            View full activity log →
          </a>
          <a href="/labels" className="text-gold underline">
            Print QR labels →
          </a>
        </div>
      </main>
    </div>
  )
}
