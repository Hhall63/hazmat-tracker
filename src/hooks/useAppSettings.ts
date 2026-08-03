'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useRealtimeRefetch } from './useRealtimeRefetch'
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/settings/types'
import { mergeSettings } from '@/lib/settings/mergeSettings'

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) return
      setSettings(mergeSettings(await res.json()))
    } catch {
      // keep last-known/defaults on failure
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const client = getSupabaseClient()
  useRealtimeRefetch(client, 'app_settings', refetch)

  return settings
}
