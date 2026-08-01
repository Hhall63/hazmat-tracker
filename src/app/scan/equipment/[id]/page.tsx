'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { useLocalName } from '@/hooks/useLocalName'
import type { EquipmentItem, EquipmentStatus } from '@/lib/types'

export default function ScanEquipmentPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<EquipmentItem | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [name] = useLocalName()
  const [problemText, setProblemText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/equipment/${params.id}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data: EquipmentItem = await response.json()
        if (cancelled) return
        if (data.status === 'retired') {
          setNotFound(true)
          return
        }
        setItem(data)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  async function toggleStatus() {
    if (!item) return
    const nextStatus: EquipmentStatus = item.status === 'in_service' ? 'out_of_service' : 'in_service'
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/equipment/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, updatedBy: name }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      const updated: EquipmentItem = await response.json()
      setItem(updated)
    } catch {
      setError('Failed to save — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function retire() {
    if (!item) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/equipment/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'retired', updatedBy: name }),
      })
      if (!response.ok) throw new Error('Failed to retire item')
      setNotFound(true)
    } catch {
      setError('Failed to save — please try again.')
      setSubmitting(false)
    }
  }

  async function logProblem() {
    if (!item || !problemText) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          description: `${item.name}: ${problemText}`,
          createdBy: name,
        }),
      })
      if (!response.ok) throw new Error('Failed to log problem')
      setProblemText('')
    } catch {
      setError('Failed to save — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="p-6 text-ink">This item is no longer active.</main>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="p-6 text-ink-dim">Loading…</main>
      </div>
    )
  }

  const toggleLabel = item.status === 'in_service' ? 'Mark Out of Service' : 'Mark In Service'

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-sm space-y-6 p-6 text-ink">
        <div>
          <h2 className="text-lg font-bold">{item.name}</h2>
          <p className={item.status === 'in_service' ? 'text-status-green' : 'text-status-red'}>
            {item.status === 'in_service' ? 'In Service' : 'Out of Service'}
          </p>
        </div>

        {error && <p className="text-sm text-status-red">{error}</p>}

        <button
          onClick={toggleStatus}
          disabled={submitting || !name}
          className="w-full rounded bg-gold px-4 py-3 text-lg font-bold text-bg disabled:opacity-50"
        >
          {toggleLabel}
        </button>

        <div>
          <label htmlFor="problem-input" className="block text-sm text-ink-dim">
            Log a problem with this item
          </label>
          <input
            id="problem-input"
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            className="mt-1 w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink"
          />
          <button
            onClick={logProblem}
            disabled={submitting || !name || !problemText}
            className="mt-2 w-full rounded bg-status-red px-4 py-2 text-ink disabled:opacity-50"
          >
            Log problem
          </button>
        </div>

        <button
          onClick={retire}
          disabled={submitting || !name}
          className="text-xs text-status-red underline disabled:opacity-50"
        >
          Retire this item
        </button>
      </main>
    </div>
  )
}
