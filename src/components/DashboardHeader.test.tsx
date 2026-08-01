import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardHeader } from './DashboardHeader'

describe('DashboardHeader', () => {
  it('renders the crest image and title', () => {
    render(<DashboardHeader />)
    expect(screen.getByAltText('Greensboro Fire Department badge')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /hazmat inventory/i })).toBeInTheDocument()
  })

  it('renders an optional subtitle', () => {
    render(<DashboardHeader subtitle="Engine 11 · Ladder 21 · RRT 5" />)
    expect(screen.getByText('Engine 11 · Ladder 21 · RRT 5')).toBeInTheDocument()
  })
})
