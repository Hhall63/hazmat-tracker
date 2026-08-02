'use client'

import { useValueHighlight } from '@/hooks/useValueHighlight'

export type StatTone = 'bad' | 'warn' | 'ok' | 'neutral'

const TONE_CLASSES: Record<StatTone, string> = {
  bad: 'text-status-red',
  warn: 'text-status-amber',
  ok: 'text-status-green',
  neutral: 'text-gold-bright',
}

export function StatTile({
  value,
  label,
  tone = 'neutral',
}: {
  value: number
  label: string
  tone?: StatTone
}) {
  const highlighted = useValueHighlight(value)

  return (
    <div
      className={`rounded-lg border px-3 py-2 transition-colors duration-200 motion-reduce:transition-none ${
        highlighted ? 'border-gold-bright bg-panel2' : 'border-gold/20 bg-panel'
      }`}
    >
      <div className={`font-mono text-2xl font-extrabold leading-none ${TONE_CLASSES[tone]}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-ink-dim">{label}</div>
    </div>
  )
}
