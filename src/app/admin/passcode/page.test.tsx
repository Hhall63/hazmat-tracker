import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PasscodePage from './page'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }))
})

describe('PasscodePage', () => {
  it('PUTs the new passcode', async () => {
    render(<PasscodePage />)
    fireEvent.change(screen.getByLabelText(/new passcode/i), { target: { value: 'longenough' } })
    fireEvent.click(screen.getByRole('button', { name: /update passcode/i }))
    await waitFor(() => {
      const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(put![0]).toBe('/api/admin/passcode')
    })
  })
})
