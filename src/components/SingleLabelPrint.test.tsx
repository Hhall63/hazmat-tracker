import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SingleLabelPrint } from './SingleLabelPrint'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}))

beforeEach(() => {
  window.localStorage.clear()
})

describe('SingleLabelPrint', () => {
  it('renders the title and a size selector', () => {
    render(<SingleLabelPrint value="https://x/scan/equipment/1" title="MultiRAE" />)
    expect(screen.getByText('MultiRAE')).toBeInTheDocument()
    expect(screen.getByLabelText('Label size')).toBeInTheDocument()
  })

  it('injects an @page size and calls window.print on Print', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<SingleLabelPrint value="v" title="T" />)
    fireEvent.click(screen.getByText('Print label'))
    const style = document.getElementById('label-page-size')
    expect(style?.textContent).toContain('@page')
    expect(style?.textContent).toContain('size:')
    expect(printSpy).toHaveBeenCalled()
  })
})
