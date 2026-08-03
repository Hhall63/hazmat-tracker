import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanActionsPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => DEFAULT_SETTINGS }))
})

describe('ScanActionsPage', () => {
  it('disables tank retire and saves', async () => {
    render(<ScanActionsPage />)
    const cb = await screen.findByLabelText(/tank: retire/i)
    fireEvent.click(cb)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(JSON.parse(put![1].body).scanActions.tankDefaults.retire).toBe(false)
    })
  })
})
