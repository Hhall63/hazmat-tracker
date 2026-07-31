'use client'

import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES } from '@/lib/types'
import type { EquipmentItem, EquipmentStatus } from '@/lib/types'

async function toggleStatus(item: EquipmentItem, updatedBy: string) {
  const nextStatus: EquipmentStatus = item.status === 'in_service' ? 'out_of_service' : 'in_service'
  await fetch(`/api/equipment/${item.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: nextStatus, updatedBy }),
  })
}

async function retireItem(item: EquipmentItem, updatedBy: string) {
  await fetch(`/api/equipment/${item.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'retired', updatedBy }),
  })
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
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">Equipment</h2>
      {EQUIPMENT_CATEGORIES.map((category) => {
        const categoryItems = items.filter((i) => i.category === category && i.status !== 'retired')
        if (categoryItems.length === 0) return null
        return (
          <div key={category} className="mb-3">
            <h3 className="font-medium">{CATEGORY_LABELS[category]}</h3>
            <ul>
              {categoryItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span
                    data-testid={`status-${item.id}`}
                    className={item.status === 'in_service' ? 'text-green-600' : 'text-red-600'}
                  >
                    ●
                  </span>
                  {item.name}
                  <button
                    disabled={!updatedBy}
                    onClick={async () => {
                      await toggleStatus(item, updatedBy)
                      onChanged()
                    }}
                    className="text-xs underline disabled:opacity-50"
                  >
                    Toggle
                  </button>
                  <button
                    disabled={!updatedBy}
                    onClick={async () => {
                      await retireItem(item, updatedBy)
                      onChanged()
                    }}
                    className="text-xs text-red-600 underline disabled:opacity-50"
                  >
                    Retire
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
