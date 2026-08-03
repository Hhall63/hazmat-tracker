'use client'

import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'

export default function ScanActionsPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()
  const { tankDefaults, equipmentDefaults } = settings.scanActions

  const setTank = (k: keyof typeof tankDefaults) =>
    setSettings({
      ...settings,
      scanActions: { ...settings.scanActions, tankDefaults: { ...tankDefaults, [k]: !tankDefaults[k] } },
    })
  const setEquip = (k: keyof typeof equipmentDefaults) =>
    setSettings({
      ...settings,
      scanActions: { ...settings.scanActions, equipmentDefaults: { ...equipmentDefaults, [k]: !equipmentDefaults[k] } },
    })

  const row = (label: string, checked: boolean, onChange: () => void) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" aria-label={label} checked={checked} onChange={onChange} />
      {label}
    </label>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gold-bright">Scan actions</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gold">Tank scan screen</h3>
        {row('Tank: PSI update', tankDefaults.psi, () => setTank('psi'))}
        {row('Tank: status toggle', tankDefaults.status, () => setTank('status'))}
        {row('Tank: log a problem', tankDefaults.logProblem, () => setTank('logProblem'))}
        {row('Tank: retire', tankDefaults.retire, () => setTank('retire'))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gold">Equipment scan screen</h3>
        {row('Equipment: status toggle', equipmentDefaults.status, () => setEquip('status'))}
        {row('Equipment: log a problem', equipmentDefaults.logProblem, () => setEquip('logProblem'))}
        {row('Equipment: retire', equipmentDefaults.retire, () => setEquip('retire'))}
      </div>

      <p className="text-xs text-ink-dim">These apply to all items of each type. Per-item exceptions can be added later.</p>
      <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
    </div>
  )
}
