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
  it('renders the dashboard heading and the cylinders section', async () => {
    render(<DashboardPage />)
    expect(
      await screen.findByRole('heading', { name: /hazmat inventory dashboard/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Cylinders')).toBeInTheDocument()
  })
})
