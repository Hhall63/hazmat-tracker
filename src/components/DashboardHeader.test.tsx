import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardHeader } from './DashboardHeader'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    ...DEFAULT_SETTINGS,
    branding: { ...DEFAULT_SETTINGS.branding, title: 'HAZMAT Inventory', subtitle: 'Sub Default' },
  }),
}))

describe('DashboardHeader', () => {
  it('renders the settings title and badge', () => {
    render(<DashboardHeader />)
    expect(screen.getByRole('heading', { name: /hazmat inventory/i })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', '/gfd-badge.png')
  })

  it('uses the settings subtitle when no prop is given', () => {
    render(<DashboardHeader />)
    expect(screen.getByText('Sub Default')).toBeInTheDocument()
  })

  it('prefers an explicit subtitle prop', () => {
    render(<DashboardHeader subtitle="Explicit" />)
    expect(screen.getByText('Explicit')).toBeInTheDocument()
  })
})
