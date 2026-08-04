'use client'

import { useEffect, useState } from 'react'
import { useAppSettings } from '@/hooks/useAppSettings'
import { QrLabel } from '@/components/QrLabel'
import { resolveLabelDimensions, LABEL_PRESETS, type LabelSelection } from '@/lib/labelSize'

const STORAGE_KEY = 'hazmat-label-size'

export function SingleLabelPrint({
  value,
  title,
  subtitle,
}: {
  value: string
  title: string
  subtitle?: string
}) {
  const settings = useAppSettings()
  const [sel, setSel] = useState<LabelSelection>({ preset: '2x1', unit: 'in' })

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSel(JSON.parse(stored))
      } catch {
        /* ignore bad json */
      }
    }
  }, [])

  const update = (next: LabelSelection) => {
    setSel(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const dims = resolveLabelDimensions(sel)

  function print() {
    let style = document.getElementById('label-page-size') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'label-page-size'
      document.head.appendChild(style)
    }
    style.textContent = `@page { size: ${dims.pageSize}; margin: 0 } @media print { body * { visibility: hidden } .print-only-label, .print-only-label * { visibility: visible } .print-only-label { position: fixed; inset: 0 } }`
    window.print()
  }

  const field = 'rounded border border-gold/20 bg-panel px-2 py-1 text-ink'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col text-sm text-ink-dim">
          Label size
          <select
            aria-label="Label size"
            className={field}
            value={sel.preset}
            onChange={(e) => update({ ...sel, preset: e.target.value })}
          >
            {LABEL_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </label>
        {sel.preset === 'custom' && (
          <>
            <label className="flex flex-col text-sm text-ink-dim">
              Width
              <input
                aria-label="Custom width"
                type="number"
                min={0.1}
                step={0.1}
                className={field}
                value={sel.customW ?? ''}
                onChange={(e) => update({ ...sel, customW: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col text-sm text-ink-dim">
              Height
              <input
                aria-label="Custom height"
                type="number"
                min={0.1}
                step={0.1}
                className={field}
                value={sel.customH ?? ''}
                onChange={(e) => update({ ...sel, customH: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col text-sm text-ink-dim">
              Unit
              <select
                aria-label="Unit"
                className={field}
                value={sel.unit ?? 'in'}
                onChange={(e) => update({ ...sel, unit: e.target.value as 'in' | 'mm' })}
              >
                <option value="in">inches</option>
                <option value="mm">mm</option>
              </select>
            </label>
          </>
        )}
        <button onClick={print} className="rounded bg-gold px-3 py-1 text-bg">
          Print label
        </button>
      </div>

      <div
        className="print-only-label mx-auto flex items-center justify-center"
        style={{ width: dims.widthCss, height: dims.heightCss }}
      >
        <QrLabel
          value={value}
          title={title}
          subtitle={subtitle}
          qrSize={dims.qrPx}
          showLogo={settings.labels.showLogo}
          badgeImageUrl={settings.branding.badgeImageUrl}
          footerText={settings.labels.footerText}
        />
      </div>
    </div>
  )
}
