'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { useLocalName } from '@/hooks/useLocalName'
import type { Tank, TankStatus } from '@/lib/types'

export default function ScanTankPage({ params }: { params: { id: string } }) {
  const [tank, setTank] = useState<Tank | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [psi, setPsi] = useState('')
  const [name, setName] = useLocalName()
  const [problemText, setProblemText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/tanks/${params.id}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data: Tank = await response.json()
        if (cancelled) return
        if (data.status === 'retired') {
          setNotFound(true)
          return
        }
        setTank(data)
        setPsi(String(data.psi))
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  async function updatePsi() {
    if (!tank) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/tanks/${tank.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ psi: Number(psi), updatedBy: name }),
      })
      if (!response.ok) throw new Error('Failed to update PSI')
      const updated: Tank = await response.json()
      setTank(updated)
      setPsi(String(updated.psi))
    } catch {
      setError('Failed to save — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function retire() {
    if (!tank) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/tanks/${tank.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'retired' as TankStatus, updatedBy: name }),
      })
      if (!response.ok) throw new Error('Failed to retire tank')
      setNotFound(true)
    } catch {
      setError('Failed to save — please try again.')
      setSubmitting(false)
    }
  }

  async function logProblem() {
    if (!tank || !problemText) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          description: `${tank.gasType} (${tank.assignedMeter ?? 'unassigned'}): ${problemText}`,
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

  if (!tank) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="p-6 text-ink-dim">Loading…</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-sm space-y-6 p-6 text-ink">
        <label className="block text-sm text-ink-dim">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink"
          />
        </label>

        <div>
          <h2 className="text-lg font-bold">{tank.gasType}</h2>
          <p className="text-sm text-ink-dim">{tank.assignedMeter ?? 'Unassigned'}</p>
          <p className="font-mono text-3xl font-extrabold">{tank.psi} psi</p>
        </div>

        {error && <p className="text-sm text-status-red">{error}</p>}

        <div>
          <label htmlFor="psi-input" className="block text-sm text-ink-dim">
            PSI
          </label>
          <input
            id="psi-input"
            aria-label="PSI"
            type="number"
            value={psi}
            onChange={(e) => setPsi(e.target.value)}
            className="mt-1 w-full rounded border border-gold/20 bg-panel px-3 py-2 text-2xl text-ink"
          />
          <button
            onClick={updatePsi}
            disabled={submitting || !name}
            className="mt-2 w-full rounded bg-gold px-4 py-3 text-lg font-bold text-bg disabled:opacity-50"
          >
            Update PSI
          </button>
        </div>

        <div>
          <label htmlFor="problem-input" className="block text-sm text-ink-dim">
            Log a problem with this tank
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
          Retire this tank
        </button>
      </main>
    </div>
  )
}
