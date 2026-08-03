import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import QrPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, opts?: any) => {
    if (url === '/api/settings') return { ok: true, json: async () => DEFAULT_SETTINGS }
    if (url === '/api/custom-qr') return { ok: true, json: async () => [] }
    if (url === '/api/admin/custom-qr' && opts?.method === 'POST')
      return { ok: true, status: 201, json: async () => ({ id: '1', label: 'SDS', targetUrl: 'https://x.co', active: true, createdBy: 'admin', createdAt: '' }) }
    return { ok: true, json: async () => ({}) }
  }))
})

describe('QrPage', () => {
  it('creates a custom code', async () => {
    render(<QrPage />)
    fireEvent.change(await screen.findByLabelText(/code label/i), { target: { value: 'SDS' } })
    fireEvent.change(screen.getByLabelText(/target url/i), { target: { value: 'https://x.co' } })
    fireEvent.click(screen.getByRole('button', { name: /add code/i }))
    await waitFor(() => {
      const post = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0] === '/api/admin/custom-qr' && c[1]?.method === 'POST'
      )
      expect(post).toBeTruthy()
    })
  })
})
