import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BoardPage from './page'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})

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

describe('BoardPage', () => {
  it('renders the header and stat bar with no interactive controls', async () => {
    render(<BoardPage />)
    expect(await screen.findByRole('heading', { name: /hazmat inventory/i })).toBeInTheDocument()
    expect(screen.getByTestId('stat-bar')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('renders section headings from settings', async () => {
    render(<BoardPage />)
    expect(await screen.findByText('Cylinders')).toBeInTheDocument()
    expect(screen.getByText('Equipment')).toBeInTheDocument()
  })
})
