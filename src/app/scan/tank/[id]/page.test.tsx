import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanTankPage from './page'
import type { Tank } from '@/lib/types'

const tank: Tank = {
  id: 'tank-1',
  gasType: 'Oxygen',
  assignedMeter: 'Meter 3',
  psi: 2000,
  maxPsi: 2200,
  status: 'in_use',
  lastUpdatedBy: 'A',
  lastUpdatedAt: new Date().toISOString(),
}

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('hazmat-dashboard-name', 'A. Lee')
})

describe('ScanTankPage', () => {
  it('shows the tank and pre-fills the PSI form with its current value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => tank }))
    render(<ScanTankPage params={{ id: 'tank-1' }} />)

    expect(await screen.findByText('Oxygen')).toBeInTheDocument()
    expect(screen.getByLabelText('PSI')).toHaveValue(2000)
  })

  it('PATCHes the new PSI on Update', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => tank })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...tank, psi: 1800 }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanTankPage params={{ id: 'tank-1' }} />)
    await screen.findByText('Oxygen')

    fireEvent.change(screen.getByLabelText('PSI'), { target: { value: '1800' } })
    fireEvent.click(screen.getByText('Update PSI'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/tanks/tank-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ psi: 1800, updatedBy: 'A. Lee' }),
        })
      )
    )
  })

  it('shows a "no longer active" state for a retired or missing tank', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    render(<ScanTankPage params={{ id: 'missing' }} />)
    expect(await screen.findByText(/no longer active/i)).toBeInTheDocument()
  })
})
