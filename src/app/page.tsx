'use client'

import { useCallback, useEffect, useState } from 'react'
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
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">HAZMAT Inventory Dashboard</h1>
      <label className="block text-sm">
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} className="block border px-2 py-1" />
      </label>
      <ProblemsBanner latestProblem={latestProblem} />
      <TankSection tanks={tanks} updatedBy={name} onChanged={refetchTanks} />
      <EquipmentSection items={equipment} updatedBy={name} onChanged={refetchEquipment} />
      <a href="/log" className="text-sm underline">
        View full activity log →
      </a>
    </main>
  )
}
