import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QrCode } from './QrCode'
import QRCode from 'qrcode'

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake'),
  },
}))

describe('QrCode', () => {
  it('renders an image with the generated data URL once ready', async () => {
    render(<QrCode value="https://hazmat-tracker.vercel.app/scan/tank/abc" />)
    const img = await waitFor(() => screen.getByRole('img'))
    expect(img).toHaveAttribute('src', 'data:image/png;base64,fake')
  })

  it('shows a failure message when QR generation rejects', async () => {
    vi.mocked(QRCode.toDataURL).mockRejectedValueOnce(new Error('too long'))
    render(<QrCode value="https://hazmat-tracker.vercel.app/scan/tank/abc" />)
    expect(await screen.findByText('Failed to generate QR')).toBeInTheDocument()
  })
})
