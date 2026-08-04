'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalName } from '@/hooks/useLocalName'
import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES, TANK_STATUSES } from '@/lib/types'
import type { EquipmentCategory, TankStatus } from '@/lib/types'
import { equipmentScanPath, tankScanPath, toAbsoluteUrl } from '@/lib/scanUrl'

type Kind = 'equipment' | 'tank'

export default function NewLabelPage() {
  const router = useRouter()
  const [name, setName] = useLocalName()
  const [kind, setKind] = useState<Kind>('equipment')
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState<EquipmentCategory>('meter_detector')
  const [gasType, setGasType] = useState('')
  const [assignedMeter, setAssignedMeter] = useState('')
  const [psi, setPsi] = useState(2000)
  const [maxPsi, setMaxPsi] = useState(2200)
  const [tankStatus, setTankStatus] = useState<TankStatus>('spare')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const origin = window.location.origin
      let value: string
      let title: string
      let subtitle: string | undefined
      if (kind === 'equipment') {
        const r = await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: itemName, category, status: 'in_service', createdBy: name }),
        })
        if (!r.ok) throw new Error('create failed')
        const item = await r.json()
        value = toAbsoluteUrl(equipmentScanPath(item.id), origin)
        title = item.name
      } else {
        const r = await fetch('/api/tanks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            gasType,
            assignedMeter: assignedMeter || null,
            psi,
            maxPsi,
            status: tankStatus,
            createdBy: name,
          }),
        })
        if (!r.ok) throw new Error('create failed')
        const item = await r.json()
        value = toAbsoluteUrl(tankScanPath(item.id), origin)
        title = item.gasType
        subtitle = item.assignedMeter ?? undefined
      }
      const q = new URLSearchParams({ value, title })
      if (subtitle) q.set('subtitle', subtitle)
      router.push(`/labels/print?${q.toString()}`)
    } catch {
      setError('Could not create the item — check the fields and try again.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink'
  const canSubmit = !!name && (kind === 'equipment' ? !!itemName : !!gasType)

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6 text-ink">
      <h2 className="text-xl font-bold">Label maker</h2>

      <div className="flex gap-2">
        {(['equipment', 'tank'] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded px-3 py-1 ${kind === k ? 'bg-gold text-bg' : 'bg-panel text-ink-dim'}`}
          >
            {k === 'equipment' ? 'Equipment' : 'Tank'}
          </button>
        ))}
      </div>

      <label className="block text-sm text-ink-dim">
        Your name
        <input aria-label="Your name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      {kind === 'equipment' ? (
        <>
          <label className="block text-sm text-ink-dim">
            Name
            <input aria-label="Name" className={field} value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </label>
          <label className="block text-sm text-ink-dim">
            Category
            <select
              aria-label="Category"
              className={field}
              value={category}
              onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
            >
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm text-ink-dim">
            Gas type
            <input aria-label="Gas type" className={field} value={gasType} onChange={(e) => setGasType(e.target.value)} />
          </label>
          <label className="block text-sm text-ink-dim">
            Assigned meter
            <input
              aria-label="Assigned meter"
              className={field}
              value={assignedMeter}
              onChange={(e) => setAssignedMeter(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <label className="block text-sm text-ink-dim">
              PSI
              <input aria-label="PSI" type="number" className={field} value={psi} onChange={(e) => setPsi(Number(e.target.value))} />
            </label>
            <label className="block text-sm text-ink-dim">
              Max PSI
              <input aria-label="Max PSI" type="number" className={field} value={maxPsi} onChange={(e) => setMaxPsi(Number(e.target.value))} />
            </label>
          </div>
          <label className="block text-sm text-ink-dim">
            Status
            <select
              aria-label="Status"
              className={field}
              value={tankStatus}
              onChange={(e) => setTankStatus(e.target.value as TankStatus)}
            >
              {TANK_STATUSES.filter((s) => s !== 'retired').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <button
        onClick={submit}
        disabled={busy || !canSubmit}
        className="rounded bg-gold px-4 py-2 text-bg disabled:opacity-50"
      >
        Create &amp; make label
      </button>
      {error && <p className="text-sm text-status-red">{error}</p>}
    </main>
  )
}
