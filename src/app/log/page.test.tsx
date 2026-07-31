import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LogPage from './page'

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

describe('LogPage', () => {
  it('renders the activity log heading', async () => {
    render(<LogPage />)
    expect(await screen.findByRole('heading', { name: /activity log/i })).toBeInTheDocument()
  })
})
