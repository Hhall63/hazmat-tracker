import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewLabelPage from './page'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => {
  push.mockClear()
  window.localStorage.setItem('hazmat-dashboard-name', 'J. Smith')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'eq-9', name: 'MultiRAE', category: 'meter_detector' }),
    })),
  )
})

describe('NewLabelPage', () => {
  it('creates equipment then routes to the print page with the scan URL', async () => {
    render(<NewLabelPage />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'MultiRAE' } })
    fireEvent.click(screen.getByText('Create & make label'))
    await waitFor(() => expect(push).toHaveBeenCalled())
    const url = push.mock.calls[0][0] as string
    expect(url).toContain('/labels/print?')
    expect(url).toContain('value=')
    expect(url).toContain('scan%2Fequipment%2Feq-9')
    expect(url).toContain('title=MultiRAE')
  })
})
