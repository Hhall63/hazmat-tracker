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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    const input: NewTankInput = {
      gasType,
      assignedMeter: assignedMeter || null,
      psi: Number(psi),
      maxPsi: Number(maxPsi),
      status,
      createdBy: updatedBy,
    }
    await fetch('/api/tanks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    setSubmitting(false)
    setGasType('')
    setAssignedMeter('')
    setPsi('')
    setMaxPsi('')
    onAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <label className="flex flex-col text-sm">
        Gas type
        <input value={gasType} onChange={(e) => setGasType(e.target.value)} required />
      </label>
      <label className="flex flex-col text-sm">
        Assigned meter
        <input value={assignedMeter} onChange={(e) => setAssignedMeter(e.target.value)} />
      </label>
      <label className="flex flex-col text-sm">
        PSI
        <input type="number" value={psi} onChange={(e) => setPsi(e.target.value)} required />
      </label>
      <label className="flex flex-col text-sm">
        Max PSI
        <input type="number" value={maxPsi} onChange={(e) => setMaxPsi(e.target.value)} required />
      </label>
      <label className="flex flex-col text-sm">
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as TankStatus)}>
          <option value="in_use">In use</option>
          <option value="spare">Spare</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting || !updatedBy}
        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        Add tank
      </button>
    </form>
  )
}
