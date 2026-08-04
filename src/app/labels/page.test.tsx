import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LabelsPage from './page'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/tanks') {
        return Promise.resolve({
          json: async () => [
            {
              id: 'tank-1',
              gasType: 'Oxygen',
              assignedMeter: 'Meter 3',
              psi: 2000,
              maxPsi: 2200,
              status: 'in_use',
              lastUpdatedBy: 'A',
              lastUpdatedAt: new Date().toISOString(),
            },
          ],
        })
      }
      if (url === '/api/equipment') {
        return Promise.resolve({
          json: async () => [
            {
              id: 'eq-1',
              name: 'SCBA Pack #3',
              category: 'meter_detector',
              status: 'in_service',
              lastUpdatedBy: 'A',
              lastUpdatedAt: new Date().toISOString(),
            },
          ],
        })
      }
      return Promise.resolve({ json: async () => [] })
    })
  )
})

describe('LabelsPage', () => {
  it('lists a label for every active tank, equipment item, and the generic problem code', async () => {
    render(<LabelsPage />)
    expect(await screen.findByText('Oxygen')).toBeInTheDocument()
    expect(screen.getByText('SCBA Pack #3')).toBeInTheDocument()
    expect(screen.getByText('Log a Problem (general)')).toBeInTheDocument()
  })

  it('renders a Print All action', async () => {
    render(<LabelsPage />)
    await screen.findByText('Oxygen')
    expect(screen.getByText('Print All')).toBeInTheDocument()
  })

  it('offers a New label link and per-card Print label links', async () => {
    render(<LabelsPage />)
    await screen.findByText('Oxygen')
    expect(screen.getByText('＋ New label').closest('a')).toHaveAttribute('href', '/labels/new')
    expect(screen.getAllByText('Print label').length).toBeGreaterThan(0)
  })
})
