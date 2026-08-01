import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from './page'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: () => {},
  }),
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => [],
    })
  )
})

describe('DashboardPage', () => {
  it('renders the header, stat bar, and the cylinders section', async () => {
    render(<DashboardPage />)
    expect(await screen.findByRole('heading', { name: /hazmat inventory/i })).toBeInTheDocument()
    expect(screen.getByTestId('stat-bar')).toBeInTheDocument()
    expect(screen.getByText('Cylinders')).toBeInTheDocument()
  })

  it('links to the activity log and QR labels pages', async () => {
    render(<DashboardPage />)
    await screen.findByTestId('stat-bar')
    expect(screen.getByText('View full activity log →')).toHaveAttribute('href', '/log')
    expect(screen.getByText('Print QR labels →')).toHaveAttribute('href', '/labels')
  })
})
