import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanTankPage from './page'
import type { Tank } from '@/lib/types'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

// Mutable settings the mock returns; tests can override before render.
const state = vi.hoisted(() => ({ override: null as null | object }))

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => state.override ?? mod.DEFAULT_SETTINGS }
})

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
  state.override = null
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

  it('shows an error and keeps the form usable when the PSI update fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => tank })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanTankPage params={{ id: 'tank-1' }} />)
    await screen.findByText('Oxygen')

    fireEvent.click(screen.getByText('Update PSI'))

    await waitFor(() =>
      expect(screen.getByText('Failed to save — please try again.')).toBeInTheDocument()
    )
    expect(screen.getByText('Update PSI')).not.toBeDisabled()
  })

  it('shows the "no longer active" state after a successful retire', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => tank })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...tank, status: 'retired' }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanTankPage params={{ id: 'tank-1' }} />)
    await screen.findByText('Oxygen')

    fireEvent.click(screen.getByText('Retire this tank'))

    expect(await screen.findByText(/no longer active/i)).toBeInTheDocument()
  })

  it('shows a name input; entering a name enables the disabled Update PSI button', async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => tank }))
    render(<ScanTankPage params={{ id: 'tank-1' }} />)
    await screen.findByText('Oxygen')

    expect(screen.getByText('Update PSI')).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'A. Lee' } })

    expect(screen.getByText('Update PSI')).not.toBeDisabled()
  })

  it('hides the retire action when the config disables it for this tank', async () => {
    state.override = {
      ...DEFAULT_SETTINGS,
      scanActions: {
        ...DEFAULT_SETTINGS.scanActions,
        overrides: { 'tank-1': { retire: false } },
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => tank }))
    render(<ScanTankPage params={{ id: 'tank-1' }} />)
    await screen.findByText('Oxygen')
    expect(screen.queryByText(/retire this tank/i)).not.toBeInTheDocument()
  })
})
