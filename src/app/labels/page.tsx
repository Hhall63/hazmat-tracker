'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { QrCode } from '@/components/QrCode'
import { equipmentScanPath, problemScanPath, tankScanPath, toAbsoluteUrl } from '@/lib/scanUrl'
import type { EquipmentItem, Tank } from '@/lib/types'

export default function LabelsPage() {
  const [tanks, setTanks] = useState<Tank[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    fetch('/api/tanks').then(async (r) => setTanks(await r.json()))
    fetch('/api/equipment').then(async (r) => setEquipment(await r.json()))
    setOrigin(window.location.origin)
  }, [])

  const activeTanks = tanks.filter((t) => t.status !== 'retired')
  const activeEquipment = equipment.filter((e) => e.status !== 'retired')

  return (
    <div className="min-h-screen print:bg-white">
      <div className="print:hidden">
        <DashboardHeader />
      </div>
      <main className="mx-auto max-w-4xl p-6 text-ink print:text-black">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold">QR Labels</h2>
          <button
            onClick={() => window.print()}
            className="rounded bg-gold px-3 py-1 text-bg"
          >
            Print All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 print:grid-cols-3">
          <div className="rounded border border-gold/20 bg-panel p-3 text-center print:border-black print:bg-white">
            <QrCode value={toAbsoluteUrl(problemScanPath(), origin)} />
            <p className="mt-2 text-sm">Log a Problem (general)</p>
          </div>
          {activeTanks.map((tank) => (
            <div
              key={tank.id}
              className="rounded border border-gold/20 bg-panel p-3 text-center print:border-black print:bg-white"
            >
              <QrCode value={toAbsoluteUrl(tankScanPath(tank.id), origin)} />
              <p className="mt-2 text-sm">{tank.gasType}</p>
              <p className="text-xs text-ink-dim">{tank.assignedMeter ?? 'Unassigned'}</p>
            </div>
          ))}
          {activeEquipment.map((item) => (
            <div
              key={item.id}
              className="rounded border border-gold/20 bg-panel p-3 text-center print:border-black print:bg-white"
            >
              <QrCode value={toAbsoluteUrl(equipmentScanPath(item.id), origin)} />
              <p className="mt-2 text-sm">{item.name}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
