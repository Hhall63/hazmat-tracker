'use client'

import { useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useRealtimeRefetch(
  client: SupabaseClient,
  table: string,
  onChange: () => void
): void {
  useEffect(() => {
    const channel = client
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [client, table, onChange])
}
