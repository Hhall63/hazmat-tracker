import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BrandingPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => DEFAULT_SETTINGS }) // GET
    .mockResolvedValue({ ok: true, json: async () => DEFAULT_SETTINGS }))    // PUT
})

describe('BrandingPage', () => {
  it('edits the title and saves', async () => {
    render(<BrandingPage />)
    const title = await screen.findByLabelText(/^title$/i)
    expect(title).toHaveValue('HAZMAT Inventory')
    fireEvent.change(title, { target: { value: 'Engine 21 HAZMAT' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(JSON.parse(put![1].body).branding.title).toBe('Engine 21 HAZMAT')
    })
  })
})
