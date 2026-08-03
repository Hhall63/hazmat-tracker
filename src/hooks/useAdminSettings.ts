'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/settings/types'

export function useAdminSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(async (r) => {
        if (r.ok) setSettings(await r.json())
      })
      .catch(() => {})
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('save failed')
      setSettings(await res.json())
      setSavedAt(Date.now())
    } catch {
      setError('Could not save — please try again.')
    } finally {
      setSaving(false)
    }
  }, [settings])

  return { settings, setSettings, save, saving, error, savedAt }
}
