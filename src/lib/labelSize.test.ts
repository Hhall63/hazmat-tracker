import { describe, it, expect } from 'vitest'
import { resolveLabelDimensions, LABEL_PRESETS } from './labelSize'

describe('resolveLabelDimensions', () => {
  it('maps a known preset to inch CSS + a page size string', () => {
    const d = resolveLabelDimensions({ preset: '2x1' })
    expect(d.widthCss).toBe('2in')
    expect(d.heightCss).toBe('1in')
    expect(d.pageSize).toBe('2in 1in')
    expect(d.qrPx).toBeGreaterThan(0)
  })

  it('sizes the QR from the smaller dimension (~0.8x, 96px/in)', () => {
    // 1in min * 96 * 0.8 = 76.8 -> 77
    expect(resolveLabelDimensions({ preset: '2x1' }).qrPx).toBe(77)
  })

  it('handles a custom size in millimetres', () => {
    const d = resolveLabelDimensions({ preset: 'custom', customW: 50, customH: 30, unit: 'mm' })
    expect(d.widthCss).toBe('50mm')
    expect(d.heightCss).toBe('30mm')
    expect(d.pageSize).toBe('50mm 30mm')
    // min 30mm = 30/25.4 in * 96 * 0.8 = 90.7 -> 91
    expect(d.qrPx).toBe(91)
  })

  it('falls back to the first preset for an unknown key', () => {
    const d = resolveLabelDimensions({ preset: 'nope' })
    expect(d.pageSize).toBe(`${LABEL_PRESETS[0].w}in ${LABEL_PRESETS[0].h}in`)
  })

  it('never returns a QR smaller than 48px', () => {
    const d = resolveLabelDimensions({ preset: 'custom', customW: 5, customH: 5, unit: 'mm' })
    expect(d.qrPx).toBe(48)
  })
})
