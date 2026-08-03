import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LayoutBoardPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => DEFAULT_SETTINGS }))
})

describe('LayoutBoardPage', () => {
  it('toggles a dashboard section visibility and saves', async () => {
    render(<LayoutBoardPage />)
    const toggle = await screen.findByLabelText(/dashboard: equipment visible/i)
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[1]?.method === 'PUT')
      const body = JSON.parse(put![1].body)
      expect(body.layout.dashboard.find((s: any) => s.key === 'equipment').visible).toBe(false)
    })
  })
})
