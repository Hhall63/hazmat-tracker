'use client'

import { useState } from 'react'
import type { Tank, TankStatus } from '@/lib/types'

export function TankControls({
  tank,
  updatedBy,
  onChanged,
}: {
  tank: Tank
  updatedBy: string
  onChanged: () => void
}) {
  const [psi, setPsi] = useState(String(tank.psi))
  const [status, setStatus] = useState<TankStatus>(tank.status)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/tanks/${tank.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ psi: Number(psi), status, updatedBy }),
      })
      if (!response.ok) throw new Error('Failed to save')
      onChanged()
    } catch {
      setError('Failed to save — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetire() {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/tanks/${tank.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'retired', updatedBy }),
      })
      if (!response.ok) throw new Error('Failed to retire')
      onChanged()
    } catch {
      setError('Failed to save — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-1 flex flex-col gap-1 text-ink">
      <div className="flex items-end gap-2">
        <label className="flex flex-col text-xs text-ink-dim">
          PSI
          <input
            type="number"
            value={psi}
            onChange={(e) => setPsi(e.target.value)}
            className="w-20 rounded border border-gold/20 bg-panel px-1 text-ink"
          />
        </label>
        <label className="flex flex-col text-xs text-ink-dim">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TankStatus)}
            className="rounded border border-gold/20 bg-panel text-ink"
          >
            <option value="in_use">In use</option>
            <option value="spare">Spare</option>
          </select>
        </label>
        <button
          onClick={handleSave}
          disabled={submitting || !updatedBy}
          className="text-xs text-gold underline disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={handleRetire}
          disabled={submitting || !updatedBy}
          className="text-xs text-status-red underline disabled:opacity-50"
        >
          Retire
        </button>
      </div>
      {error && <p className="text-xs text-status-red">{error}</p>}
    </div>
  )
}
