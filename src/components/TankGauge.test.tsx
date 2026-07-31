import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TankGauge } from './TankGauge'
import type { Tank } from '@/lib/types'

const baseTank: Tank = {
  id: '1',
  gasType: 'Methane',
  assignedMeter: 'Meter 1',
  psi: 2200,
  maxPsi: 2216,
  status: 'in_use',
  lastUpdatedBy: 'J. Smith',
  lastUpdatedAt: new Date().toISOString(),
}

describe('TankGauge', () => {
  it('renders green for a nearly full tank', () => {
    render(<TankGauge tank={baseTank} />)
    expect(screen.getByTestId('tank-gauge')).toHaveAttribute('data-color', 'green')
    expect(screen.getByText('Methane')).toBeInTheDocument()
    expect(screen.getByText('Meter 1')).toBeInTheDocument()
  })

  it('renders red for a nearly empty tank', () => {
    render(<TankGauge tank={{ ...baseTank, psi: 200 }} />)
    expect(screen.getByTestId('tank-gauge')).toHaveAttribute('data-color', 'red')
  })
})
