import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanProblemPage from './page'

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('hazmat-dashboard-name', 'A. Lee')
})

describe('ScanProblemPage', () => {
  it('submits a problem note using the remembered name', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanProblemPage />)

    fireEvent.change(screen.getByPlaceholderText('Describe the problem'), {
      target: { value: 'Deluge shower valve stuck' },
    })
    fireEvent.click(screen.getByText('Log problem'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/logs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            description: 'Deluge shower valve stuck',
            createdBy: 'A. Lee',
          }),
        })
      )
    )
  })
})
