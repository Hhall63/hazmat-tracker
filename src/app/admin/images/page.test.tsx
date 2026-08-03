import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ImagesPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => DEFAULT_SETTINGS }))
})

describe('ImagesPage', () => {
  it('shows current badge and emblem previews', async () => {
    render(<ImagesPage />)
    const imgs = await screen.findAllByRole('img')
    const srcs = imgs.map((i) => i.getAttribute('src'))
    expect(srcs).toContain('/gfd-badge.png')
    expect(srcs).toContain('/hazmat-emblem.png')
  })
})
