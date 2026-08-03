import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LogPage from './page'
import type { LogEntry } from '@/lib/types'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: () => {},
  }),
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => [],
    })
  )
})

describe('LogPage', () => {
  it('renders the activity log heading', async () => {
    render(<LogPage />)
    expect(await screen.findByRole('heading', { name: /activity log/i })).toBeInTheDocument()
  })

  it('shows an error and does not refetch when resolving a problem note fails', async () => {
    const unresolvedEntry: LogEntry = {
      id: '1',
      createdAt: new Date().toISOString(),
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    }

    const fetchMock = vi
      .fn()
      // initial GET on mount
      .mockResolvedValueOnce({ json: async () => [unresolvedEntry] })
      // failed PATCH on resolve
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<LogPage />)

    const resolveButton = await screen.findByText('Mark resolved')
    fireEvent.click(resolveButton)

    await waitFor(() =>
      expect(screen.getByText('Failed to save — please try again.')).toBeInTheDocument()
    )
    // Only the initial GET and the failed PATCH — no refetch GET after failure.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
