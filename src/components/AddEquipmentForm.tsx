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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    const input: NewEquipmentInput = {
      name,
      category,
      status: 'in_service',
      createdBy: updatedBy,
    }
    await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    setSubmitting(false)
    setName('')
    onAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <label className="flex flex-col text-sm">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col text-sm">
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value as EquipmentCategory)}>
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
        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        Add equipment
      </button>
    </form>
  )
}
