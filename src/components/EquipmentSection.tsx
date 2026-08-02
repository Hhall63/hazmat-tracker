'use client'

import { useState } from 'react'
import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES } from '@/lib/types'
import type { EquipmentItem, EquipmentStatus } from '@/lib/types'
import { AddEquipmentForm } from './AddEquipmentForm'

async function toggleStatus(item: EquipmentItem, updatedBy: string): Promise<boolean> {
  const nextStatus: EquipmentStatus = item.status === 'in_service' ? 'out_of_service' : 'in_service'
  const response = await fetch(`/api/equipment/${item.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: nextStatus, updatedBy }),
  })
  return response.ok
}

async function retireItem(item: EquipmentItem, updatedBy: string): Promise<boolean> {
  const response = await fetch(`/api/equipment/${item.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'retired', updatedBy }),
  })
  return response.ok
}

export function EquipmentSection({
  items,
  updatedBy,
  onChanged,
}: {
  items: EquipmentItem[]
  updatedBy: string
  onChanged: () => void
}) {
  const [error, setError] = useState('')

  return (
    <section className="rounded-lg border border-gold/20 bg-panel2 p-4">
      <h2 className="mb-3 text-xs uppercase tracking-wide text-gold">Equipment</h2>
      {error && <p className="mb-2 text-sm text-status-red">{error}</p>}
      {EQUIPMENT_CATEGORIES.map((category) => {
        const categoryItems = items.filter((i) => i.category === category && i.status !== 'retired')
        if (categoryItems.length === 0) return null
        return (
          <div key={category} className="mb-3">
            <h3 className="text-sm font-medium text-ink-dim">{CATEGORY_LABELS[category]}</h3>
            <ul>
              {categoryItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-ink">
                  <span
                    data-testid={`status-${item.id}`}
                    className={item.status === 'in_service' ? 'text-status-green' : 'text-status-red'}
                  >
                    ●
                  </span>
                  {item.name}
                  <button
                    disabled={!updatedBy}
                    onClick={async () => {
                      setError('')
                      const ok = await toggleStatus(item, updatedBy)
                      if (!ok) {
                        setError('Failed to save — please try again.')
                        return
                      }
                      onChanged()
                    }}
                    className="text-xs text-gold underline disabled:opacity-50"
                  >
                    Toggle
                  </button>
                  <button
                    disabled={!updatedBy}
                    onClick={async () => {
                      setError('')
                      const ok = await retireItem(item, updatedBy)
                      if (!ok) {
                        setError('Failed to save — please try again.')
                        return
                      }
                      onChanged()
                    }}
                    className="text-xs text-status-red underline disabled:opacity-50"
                  >
                    Retire
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <div className="mt-4">
        <AddEquipmentForm updatedBy={updatedBy} onAdded={onChanged} />
      </div>
    </section>
  )
}
