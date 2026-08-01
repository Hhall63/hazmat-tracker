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

  async function handleSave() {
    setSubmitting(true)
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ psi: Number(psi), status, updatedBy }),
    })
    setSubmitting(false)
    onChanged()
  }

  async function handleRetire() {
    setSubmitting(true)
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'retired', updatedBy }),
    })
    setSubmitting(false)
    onChanged()
  }

  return (
    <div className="mt-1 flex items-end gap-2 text-ink">
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
  )
}
