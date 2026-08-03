'use client'

import type { SectionConfig } from '@/lib/settings/types'

const LABELS: Record<string, string> = {
  stats: 'Stats bar',
  problems: 'Problem banner',
  cylinders: 'Cylinders',
  equipment: 'Equipment',
}

export function SectionOrderEditor({
  title,
  scope,
  sections,
  onChange,
}: {
  title: string
  scope: string
  sections: SectionConfig[]
  onChange: (next: SectionConfig[]) => void
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const toggle = (i: number) => {
    const next = sections.map((s, k) => (k === i ? { ...s, visible: !s.visible } : s))
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gold">{title}</h3>
      {sections.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 rounded border border-gold/20 bg-panel px-3 py-2">
          <span className="flex-1 text-sm">{LABELS[s.key] ?? s.key}</span>
          <label className="flex items-center gap-1 text-xs text-ink-dim">
            <input
              type="checkbox"
              aria-label={`${scope}: ${s.key} visible`}
              checked={s.visible}
              onChange={() => toggle(i)}
            />
            visible
          </label>
          <button aria-label={`${scope}: move ${s.key} up`} onClick={() => move(i, -1)} className="px-2">↑</button>
          <button aria-label={`${scope}: move ${s.key} down`} onClick={() => move(i, 1)} className="px-2">↓</button>
        </div>
      ))}
    </div>
  )
}
