'use client'

import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'
import { SectionOrderEditor } from '@/components/admin/SectionOrderEditor'
import type { BoardDensity } from '@/lib/settings/types'

const DENSITIES: BoardDensity[] = ['auto', 'comfortable', 'compact', 'dense']

export default function LayoutBoardPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gold-bright">Layout &amp; Board</h2>

      <SectionOrderEditor
        title="Dashboard sections"
        scope="dashboard"
        sections={settings.layout.dashboard}
        onChange={(dashboard) =>
          setSettings({ ...settings, layout: { ...settings.layout, dashboard } })
        }
      />
      <SectionOrderEditor
        title="Board sections"
        scope="board"
        sections={settings.layout.board}
        onChange={(board) => setSettings({ ...settings, layout: { ...settings.layout, board } })}
      />

      <label className="block text-sm text-ink-dim">Board density
        <select
          aria-label="Board density"
          className="mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink"
          value={settings.board.densityOverride}
          onChange={(e) =>
            setSettings({ ...settings, board: { densityOverride: e.target.value as BoardDensity } })
          }
        >
          {DENSITIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
    </div>
  )
}
