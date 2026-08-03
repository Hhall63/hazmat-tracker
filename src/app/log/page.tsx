'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { LogTable } from '@/components/LogTable'
import { NewProblemForm } from '@/components/NewProblemForm'
import { useLocalName } from '@/hooks/useLocalName'
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { LogEntry } from '@/lib/types'

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [name, setName] = useLocalName()
  const [resolveError, setResolveError] = useState('')

  const refetch = useCallback(async () => {
    const response = await fetch('/api/logs')
    setEntries(await response.json())
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeRefetch(getSupabaseClient(), 'log_entries', refetch)

  async function handleResolve(id: string) {
    setResolveError('')
    const response = await fetch(`/api/logs/${id}`, { method: 'PATCH' })
    if (!response.ok) {
      setResolveError('Failed to save — please try again.')
      return
    }
    refetch()
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-3xl p-6">
        <a href="/" className="text-sm text-gold underline">
          ← Back to dashboard
        </a>
        <h2 className="mb-4 mt-2 text-xl font-bold text-ink">Activity Log</h2>
        <label className="mb-4 block text-sm text-ink-dim">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-gold/20 bg-panel px-2 py-1 text-ink"
          />
        </label>
        <div className="mb-6">
          <NewProblemForm updatedBy={name} onAdded={refetch} />
        </div>
        {resolveError && <p className="mb-4 text-sm text-status-red">{resolveError}</p>}
        <LogTable entries={entries} onResolve={handleResolve} />
      </main>
    </div>
  )
}
