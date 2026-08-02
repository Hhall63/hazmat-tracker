import { useValueHighlight } from '@/hooks/useValueHighlight'
import { gaugeColor, gaugeNeedleAngleDegrees, psiPercentage } from '@/lib/gauge'
import type { Tank } from '@/lib/types'

const ZONE_HEX: Record<'red' | 'yellow' | 'green', string> = {
  red: '#d21f3c',
  yellow: '#f2b705',
  green: '#34d399',
}

export function TankGauge({ tank }: { tank: Tank }) {
  const color = gaugeColor(tank.psi, tank.maxPsi)
  const angle = gaugeNeedleAngleDegrees(tank.psi, tank.maxPsi)
  const pct = psiPercentage(tank.psi, tank.maxPsi)
  const needleX = 60 + 45 * Math.sin((angle * Math.PI) / 180)
  const needleY = 60 - 45 * Math.cos((angle * Math.PI) / 180)
  const highlighted = useValueHighlight(tank.psi)

  return (
    <div
      data-testid="tank-gauge"
      data-color={color}
      className={`flex flex-col items-center rounded-lg border px-3 py-2 transition-colors duration-200 motion-reduce:transition-none ${
        highlighted ? 'border-gold-bright bg-panel2' : 'border-gold/20 bg-panel'
      }`}
    >
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path
          d="M10,60 A50,50 0 0 1 24.64,24.64"
          fill="none"
          stroke={ZONE_HEX.red}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M24.64,24.64 A50,50 0 0 1 60,10"
          fill="none"
          stroke={ZONE_HEX.yellow}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M60,10 A50,50 0 0 1 110,60"
          fill="none"
          stroke={ZONE_HEX.green}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <line
          x1="60"
          y1="60"
          x2={needleX}
          y2={needleY}
          stroke="#eef2f7"
          strokeWidth="3"
          className="transition-all duration-200 motion-reduce:transition-none"
        />
      </svg>
      <div className="text-sm font-semibold text-ink">{tank.gasType}</div>
      <div className="text-xs text-ink-dim">{tank.assignedMeter ?? 'Unassigned'}</div>
      <div
        className="font-mono text-lg font-extrabold transition-colors duration-200 motion-reduce:transition-none"
        style={{ color: ZONE_HEX[color] }}
      >
        {tank.psi} psi ({Math.round(pct)}%)
      </div>
    </div>
  )
}
