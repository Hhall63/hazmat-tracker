import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

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

  it('omits sections marked not visible', async () => {
    const hidden = {
      ...DEFAULT_SETTINGS,
      layout: {
        ...DEFAULT_SETTINGS.layout,
        dashboard: DEFAULT_SETTINGS.layout.dashboard.map((s) =>
          s.key === 'equipment' ? { ...s, visible: false } : s
        ),
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) =>
      url === '/api/settings' ? { ok: true, json: async () => hidden } : { json: async () => [] }
    ))
    render(<DashboardPage />)
    await screen.findByTestId('stat-bar')
    await waitFor(() => expect(screen.queryByText('Equipment')).not.toBeInTheDocument())
  })
})
