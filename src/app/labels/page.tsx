'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { QrLabel } from '@/components/QrLabel'
import { useAppSettings } from '@/hooks/useAppSettings'
import { equipmentScanPath, problemScanPath, tankScanPath, toAbsoluteUrl } from '@/lib/scanUrl'
import type { CustomQrCode, EquipmentItem, Tank } from '@/lib/types'

// medium keeps today's default QR size (160).
const QR_SIZE = { small: 120, medium: 160, large: 220 } as const

export default function LabelsPage() {
  const settings = useAppSettings()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [customCodes, setCustomCodes] = useState<CustomQrCode[]>([])
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    fetch('/api/tanks').then(async (r) => setTanks(await r.json()))
    fetch('/api/equipment').then(async (r) => setEquipment(await r.json()))
    fetch('/api/custom-qr').then(async (r) => {
      if (r.ok) setCustomCodes(await r.json())
    })
    setOrigin(window.location.origin)
  }, [])

  const activeTanks = tanks.filter((t) => t.status !== 'retired')
  const activeEquipment = equipment.filter((e) => e.status !== 'retired')
  const { size, showLogo, footerText } = settings.labels
  const qrSize = QR_SIZE[size]

  const card = (key: string, value: string, title: string, subtitle?: string) => (
    <QrLabel
      key={key}
      value={value}
      title={title}
      subtitle={subtitle}
      qrSize={qrSize}
      showLogo={showLogo}
      badgeImageUrl={settings.branding.badgeImageUrl}
      footerText={footerText}
    />
  )

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
          {card('problem', toAbsoluteUrl(problemScanPath(), origin), 'Log a Problem (general)')}
          {activeTanks.map((tank) =>
            card(tank.id, toAbsoluteUrl(tankScanPath(tank.id), origin), tank.gasType, tank.assignedMeter ?? 'Unassigned')
          )}
          {activeEquipment.map((item) =>
            card(item.id, toAbsoluteUrl(equipmentScanPath(item.id), origin), item.name)
          )}
          {customCodes.map((c) => card(c.id, c.targetUrl, c.label))}
        </div>
      </main>
    </div>
  )
}
