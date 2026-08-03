import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BoardPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

// Mutable settings the mock returns; individual tests can override before render.
const state = vi.hoisted(() => ({ override: null as null | object }))

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => state.override ?? mod.DEFAULT_SETTINGS }
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
  state.override = null
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

  it('uses the density override when not auto', async () => {
    state.override = { ...DEFAULT_SETTINGS, board: { densityOverride: 'dense' as const } }
    const { container } = render(<BoardPage />)
    await screen.findByText('Cylinders')
    // `p-1.5` is unique to the dense tier; auto/comfortable would be `p-3`.
    expect(container.querySelector('.p-1\\.5')).toBeTruthy()
  })

  it('omits a board section marked not visible', async () => {
    state.override = {
      ...DEFAULT_SETTINGS,
      layout: {
        ...DEFAULT_SETTINGS.layout,
        board: DEFAULT_SETTINGS.layout.board.map((s) =>
          s.key === 'equipment' ? { ...s, visible: false } : s
        ),
      },
    }
    render(<BoardPage />)
    await screen.findByText('Cylinders')
    expect(screen.queryByText('Equipment')).not.toBeInTheDocument()
  })
})
