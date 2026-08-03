import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanEquipmentPage from './page'
import type { EquipmentItem } from '@/lib/types'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})

const item: EquipmentItem = {
  id: 'eq-1',
  name: 'Air Monitor — MultiRAE #2',
  category: 'meter_detector',
  status: 'in_service',
  lastUpdatedBy: 'A',
  lastUpdatedAt: new Date().toISOString(),
}

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('hazmat-dashboard-name', 'A. Lee')
})

describe('ScanEquipmentPage', () => {
  it('shows the item and a toggle labeled with the opposite status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => item }))
    render(<ScanEquipmentPage params={{ id: 'eq-1' }} />)

    expect(await screen.findByText('Air Monitor — MultiRAE #2')).toBeInTheDocument()
    expect(screen.getByText('Mark Out of Service')).toBeInTheDocument()
  })

  it('PATCHes the toggled status on tap', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => item })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...item, status: 'out_of_service' }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanEquipmentPage params={{ id: 'eq-1' }} />)
    await screen.findByText('Air Monitor — MultiRAE #2')

    fireEvent.click(screen.getByText('Mark Out of Service'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipment/eq-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'out_of_service', updatedBy: 'A. Lee' }),
        })
      )
    )
  })

  it('shows a "no longer active" state for a retired or missing item', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    render(<ScanEquipmentPage params={{ id: 'missing' }} />)
    expect(await screen.findByText(/no longer active/i)).toBeInTheDocument()
  })

  it('shows an error and keeps the toggle usable when the status update fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => item })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanEquipmentPage params={{ id: 'eq-1' }} />)
    await screen.findByText('Air Monitor — MultiRAE #2')

    fireEvent.click(screen.getByText('Mark Out of Service'))

    await waitFor(() =>
      expect(screen.getByText('Failed to save — please try again.')).toBeInTheDocument()
    )
    expect(screen.getByText('Mark Out of Service')).not.toBeDisabled()
  })

  it('shows the "no longer active" state after a successful retire', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => item })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...item, status: 'retired' }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanEquipmentPage params={{ id: 'eq-1' }} />)
    await screen.findByText('Air Monitor — MultiRAE #2')

    fireEvent.click(screen.getByText('Retire this item'))

    expect(await screen.findByText(/no longer active/i)).toBeInTheDocument()
  })

  it('shows a name input; entering a name enables the disabled toggle button', async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => item }))
    render(<ScanEquipmentPage params={{ id: 'eq-1' }} />)
    await screen.findByText('Air Monitor — MultiRAE #2')

    expect(screen.getByText('Mark Out of Service')).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'A. Lee' } })

    expect(screen.getByText('Mark Out of Service')).not.toBeDisabled()
  })
})
