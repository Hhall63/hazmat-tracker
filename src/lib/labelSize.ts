export const LABEL_PRESETS = [
  { key: '1x1', label: '1" × 1"', w: 1, h: 1, unit: 'in' },
  { key: '1.5x1', label: '1.5" × 1"', w: 1.5, h: 1, unit: 'in' },
  { key: '2x1', label: '2" × 1"', w: 2, h: 1, unit: 'in' },
  { key: '2x2', label: '2" × 2"', w: 2, h: 2, unit: 'in' },
  { key: '4x6', label: '4" × 6"', w: 4, h: 6, unit: 'in' },
] as const

export interface LabelSelection {
  preset: string
  customW?: number
  customH?: number
  unit?: 'in' | 'mm'
}

export interface LabelDimensions {
  widthCss: string
  heightCss: string
  pageSize: string
  qrPx: number
}

const PX_PER_IN = 96
const MIN_QR_PX = 48

function qrPxFor(w: number, h: number, unit: 'in' | 'mm'): number {
  const inMin = unit === 'mm' ? Math.min(w, h) / 25.4 : Math.min(w, h)
  return Math.max(MIN_QR_PX, Math.round(inMin * PX_PER_IN * 0.8))
}

export function resolveLabelDimensions(sel: LabelSelection): LabelDimensions {
  if (sel.preset === 'custom') {
    const unit = sel.unit ?? 'in'
    const w = sel.customW && sel.customW > 0 ? sel.customW : 1
    const h = sel.customH && sel.customH > 0 ? sel.customH : 1
    return {
      widthCss: `${w}${unit}`,
      heightCss: `${h}${unit}`,
      pageSize: `${w}${unit} ${h}${unit}`,
      qrPx: qrPxFor(w, h, unit),
    }
  }
  const p = LABEL_PRESETS.find((x) => x.key === sel.preset) ?? LABEL_PRESETS[0]
  return {
    widthCss: `${p.w}in`,
    heightCss: `${p.h}in`,
    pageSize: `${p.w}in ${p.h}in`,
    qrPx: qrPxFor(p.w, p.h, 'in'),
  }
}
