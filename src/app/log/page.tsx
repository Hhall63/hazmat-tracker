'use client'

import { useCallback, useEffect, useState } from 'react'
import { LogTable } from '@/components/LogTable'
import { NewProblemForm } from '@/components/NewProblemForm'
import { useLocalName } from '@/hooks/useLocalName'
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { LogEntry } from '@/lib/types'

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [name, setName] = useLocalName()

  const refetch = useCallback(async () => {
    const response = await fetch('/api/logs')
    setEntries(await response.json())
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeRefetch(getSupabaseClient(), 'log_entries', refetch)

  async function handleResolve(id: string) {
    await fetch(`/api/logs/${id}`, { method: 'PATCH' })
    refetch()
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Activity Log</h1>
      <label className="block mb-4 text-sm">
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} className="block border px-2 py-1" />
      </label>
      <div className="mb-6">
        <NewProblemForm updatedBy={name} onAdded={refetch} />
      </div>
      <LogTable entries={entries} onResolve={handleResolve} />
    </main>
  )
}
