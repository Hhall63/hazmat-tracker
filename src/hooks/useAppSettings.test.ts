import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAppSettings } from './useAppSettings'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  }),
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...DEFAULT_SETTINGS, branding: { ...DEFAULT_SETTINGS.branding, title: 'Truck 21' } }),
    })
  )
})

describe('useAppSettings', () => {
  it('starts with defaults then loads fetched settings', async () => {
    const { result } = renderHook(() => useAppSettings())
    expect(result.current.branding.title).toBe('HAZMAT Inventory')
    await waitFor(() => expect(result.current.branding.title).toBe('Truck 21'))
  })
})
