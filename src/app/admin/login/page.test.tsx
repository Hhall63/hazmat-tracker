import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from './page'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

beforeEach(() => {
  replace.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

describe('admin LoginPage', () => {
  it('posts the passcode and redirects on success', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/passcode/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /enter/i }))
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'))
  })

  it('shows an error on wrong passcode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/passcode/i), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /enter/i }))
    expect(await screen.findByText(/incorrect passcode/i)).toBeInTheDocument()
  })
})
