'use client'

import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'

export default function BrandingPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()

  const setBranding = (patch: Partial<typeof settings.branding>) =>
    setSettings({ ...settings, branding: { ...settings.branding, ...patch } })
  const setHeadings = (patch: Partial<typeof settings.headings>) =>
    setSettings({ ...settings, headings: { ...settings.headings, ...patch } })

  const field = 'mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink'

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gold-bright">Branding text</h2>

      <label className="block text-sm text-ink-dim">Title
        <input aria-label="Title" className={field} value={settings.branding.title}
          onChange={(e) => setBranding({ title: e.target.value })} />
      </label>
      <label className="block text-sm text-ink-dim">Subtitle
        <input aria-label="Subtitle" className={field} value={settings.branding.subtitle}
          onChange={(e) => setBranding({ subtitle: e.target.value })} />
      </label>
      <label className="block text-sm text-ink-dim">Browser tab title
        <input aria-label="Tab title" className={field} value={settings.branding.tabTitle}
          onChange={(e) => setBranding({ tabTitle: e.target.value })} />
      </label>
      <label className="block text-sm text-ink-dim">Cylinders heading
        <input aria-label="Cylinders heading" className={field} value={settings.headings.cylinders}
          onChange={(e) => setHeadings({ cylinders: e.target.value })} />
      </label>
      <label className="block text-sm text-ink-dim">Equipment heading
        <input aria-label="Equipment heading" className={field} value={settings.headings.equipment}
          onChange={(e) => setHeadings({ equipment: e.target.value })} />
      </label>

      <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
    </div>
  )
}
