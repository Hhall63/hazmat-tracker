import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NewProblemForm } from './NewProblemForm'

describe('NewProblemForm', () => {
  it('clears the field and calls onAdded on a successful submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    const onAdded = vi.fn()
    render(<NewProblemForm updatedBy="A. Lee" onAdded={onAdded} />)

    const input = screen.getByPlaceholderText('Describe the problem') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Decon pump leaking' } })
    fireEvent.click(screen.getByText('Log problem'))

    await waitFor(() => expect(onAdded).toHaveBeenCalled())
    expect(input.value).toBe('')
    expect(screen.queryByText('Failed to save — please try again.')).not.toBeInTheDocument()
  })

  it('does not call onAdded and shows an error message on a failed submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    const onAdded = vi.fn()
    render(<NewProblemForm updatedBy="A. Lee" onAdded={onAdded} />)

    const input = screen.getByPlaceholderText('Describe the problem') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Decon pump leaking' } })
    fireEvent.click(screen.getByText('Log problem'))

    await waitFor(() =>
      expect(screen.getByText('Failed to save — please try again.')).toBeInTheDocument()
    )
    expect(onAdded).not.toHaveBeenCalled()
    expect(input.value).toBe('Decon pump leaking')
  })
})
