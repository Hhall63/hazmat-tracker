'use client'

import { useState } from 'react'
import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES } from '@/lib/types'
import type { EquipmentCategory, NewEquipmentInput } from '@/lib/types'

export function AddEquipmentForm({
  updatedBy,
  onAdded,
}: {
  updatedBy: string
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<EquipmentCategory>('meter_detector')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const input: NewEquipmentInput = {
      name,
      category,
      status: 'in_service',
      createdBy: updatedBy,
    }
    try {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error('Failed to add equipment')
      setName('')
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
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
      </label>
      <label className="flex flex-col text-sm">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
          className={inputClass}
        >
          {EQUIPMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting || !updatedBy}
        className="rounded bg-gold px-3 py-1 text-bg disabled:opacity-50"
      >
        Add equipment
      </button>
      {error && <p className="w-full text-xs text-status-red">{error}</p>}
    </form>
  )
}
