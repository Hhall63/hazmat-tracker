import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminSettings } from './useAdminSettings'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => DEFAULT_SETTINGS }) // initial GET
      .mockResolvedValueOnce({ ok: true, json: async () => DEFAULT_SETTINGS }) // PUT
  )
})

describe('useAdminSettings', () => {
  it('loads settings then saves via PUT', async () => {
    const { result } = renderHook(() => useAdminSettings())
    await waitFor(() => expect(result.current.settings.branding.title).toBe('HAZMAT Inventory'))
    await act(async () => {
      await result.current.save()
    })
    const putCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(putCall[0]).toBe('/api/admin/settings')
    expect(putCall[1].method).toBe('PUT')
  })

  it('surfaces an error when save fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => DEFAULT_SETTINGS })
      .mockResolvedValueOnce({ ok: false }))
    const { result } = renderHook(() => useAdminSettings())
    await waitFor(() => expect(result.current.settings).toBeTruthy())
    await act(async () => { await result.current.save() })
    expect(result.current.error).toBeTruthy()
  })
})
