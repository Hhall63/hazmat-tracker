'use client'

import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'
import { ImageUploadField } from '@/components/admin/ImageUploadField'

export default function ImagesPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()
  const setBranding = (patch: Partial<typeof settings.branding>) =>
    setSettings({ ...settings, branding: { ...settings.branding, ...patch } })

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gold-bright">Images</h2>
      <ImageUploadField
        label="Header badge"
        currentUrl={settings.branding.badgeImageUrl}
        onUploaded={(url) => setBranding({ badgeImageUrl: url })}
      />
      <ImageUploadField
        label="HAZMAT emblem"
        currentUrl={settings.branding.emblemImageUrl}
        onUploaded={(url) => setBranding({ emblemImageUrl: url })}
      />
      <p className="text-xs text-ink-dim">Uploads are capped at 2 MB (png, jpeg, webp, or svg). Remember to Save.</p>
      <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
    </div>
  )
}
