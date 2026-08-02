'use client'

import { useState } from 'react'
import type { NewTankInput, TankStatus } from '@/lib/types'

export function AddTankForm({
  updatedBy,
  onAdded,
}: {
  updatedBy: string
  onAdded: () => void
}) {
  const [gasType, setGasType] = useState('')
  const [assignedMeter, setAssignedMeter] = useState('')
  const [psi, setPsi] = useState('')
  const [maxPsi, setMaxPsi] = useState('')
  const [status, setStatus] = useState<TankStatus>('in_use')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const input: NewTankInput = {
      gasType,
      assignedMeter: assignedMeter || null,
      psi: Number(psi),
      maxPsi: Number(maxPsi),
      status,
      createdBy: updatedBy,
    }
    try {
      const response = await fetch('/api/tanks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error('Failed to add tank')
      setGasType('')
      setAssignedMeter('')
      setPsi('')
      setMaxPsi('')
      onAdded()
    } catch {
      setError('Failed to save — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'rounded border border-gold/20 bg-panel px-2 py-1 text-ink'

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 text-ink-dim">
      <label className="flex flex-col text-sm">
        Gas type
        <input
          value={gasType}
          onChange={(e) => setGasType(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col text-sm">
        Assigned meter
        <input
          value={assignedMeter}
          onChange={(e) => setAssignedMeter(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col text-sm">
        PSI
        <input
          type="number"
          value={psi}
          onChange={(e) => setPsi(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col text-sm">
        Max PSI
        <input
          type="number"
          value={maxPsi}
          onChange={(e) => setMaxPsi(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col text-sm">
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TankStatus)}
          className={inputClass}
        >
          <option value="in_use">In use</option>
          <option value="spare">Spare</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting || !updatedBy}
        className="rounded bg-gold px-3 py-1 text-bg disabled:opacity-50"
      >
        Add tank
      </button>
      {error && <p className="w-full text-xs text-status-red">{error}</p>}
    </form>
  )
}
