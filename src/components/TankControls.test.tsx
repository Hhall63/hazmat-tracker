import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TankControls } from './TankControls'
import type { Tank } from '@/lib/types'

const tank: Tank = {
  id: '1',
  gasType: 'Methane',
  assignedMeter: 'Meter 1',
  psi: 2200,
  maxPsi: 2216,
  status: 'in_use',
  lastUpdatedBy: 'J. Smith',
  lastUpdatedAt: new Date().toISOString(),
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => tank }))
})

describe('TankControls', () => {
  it('disables Save and Retire when no name is set', () => {
    render(<TankControls tank={tank} updatedBy="" onChanged={vi.fn()} />)
    expect(screen.getByText('Save')).toBeDisabled()
    expect(screen.getByText('Retire')).toBeDisabled()
  })

  it('sends a PATCH with the edited PSI and status on Save', async () => {
    const onChanged = vi.fn()
    render(<TankControls tank={tank} updatedBy="A. Lee" onChanged={onChanged} />)
    fireEvent.change(screen.getByLabelText('PSI'), { target: { value: '1800' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tanks/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ psi: 1800, status: 'in_use', updatedBy: 'A. Lee' }),
      })
    )
  })

  it('sends a PATCH with status "retired" on Retire', async () => {
    const onChanged = vi.fn()
    render(<TankControls tank={tank} updatedBy="A. Lee" onChanged={onChanged} />)
    fireEvent.click(screen.getByText('Retire'))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tanks/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'retired', updatedBy: 'A. Lee' }),
      })
    )
  })
})
