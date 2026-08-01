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
    <main className="p-6 max-w-3xl mx-auto">
      <a href="/" className="text-sm underline">
        ← Back to dashboard
      </a>
      <h1 className="text-2xl font-bold mb-4 mt-2">Activity Log</h1>
      <label className="block mb-4 text-sm">
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} className="block border px-2 py-1" />
      </label>
      <div className="mb-6">
        <NewProblemForm updatedBy={name} onAdded={refetch} />
      </div>
      {resolveError && <p className="text-red-600 text-sm mb-4">{resolveError}</p>}
      <LogTable entries={entries} onResolve={handleResolve} />
    </main>
  )
}
