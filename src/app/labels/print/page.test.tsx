import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrintPage from './page'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('value=v&title=MultiRAE&subtitle=Meter'),
}))

describe('labels/print page', () => {
  it('renders the label for the query params', async () => {
    render(<PrintPage />)
    expect(await screen.findByText('MultiRAE')).toBeInTheDocument()
    expect(screen.getByText('Meter')).toBeInTheDocument()
  })
})
