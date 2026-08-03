import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanProblemPage from './page'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})

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

  it('shows a name input when no name is stored; entering a name enables Log problem', () => {
    window.localStorage.clear()
    render(<ScanProblemPage />)

    fireEvent.change(screen.getByPlaceholderText('Describe the problem'), {
      target: { value: 'Deluge shower valve stuck' },
    })
    expect(screen.getByText('Log problem')).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'A. Lee' } })

    expect(screen.getByText('Log problem')).not.toBeDisabled()
  })
})
