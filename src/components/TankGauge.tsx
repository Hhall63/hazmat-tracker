import { gaugeColor, gaugeNeedleAngleDegrees, psiPercentage } from '@/lib/gauge'
import type { Tank } from '@/lib/types'

const COLOR_HEX: Record<'red' | 'yellow' | 'green', string> = {
  red: '#dc2626',
  yellow: '#ca8a04',
  green: '#16a34a',
}

export function TankGauge({ tank }: { tank: Tank }) {
  const color = gaugeColor(tank.psi, tank.maxPsi)
  const angle = gaugeNeedleAngleDegrees(tank.psi, tank.maxPsi)
  const pct = psiPercentage(tank.psi, tank.maxPsi)
  const needleX = 60 + 45 * Math.sin((angle * Math.PI) / 180)
  const needleY = 60 - 45 * Math.cos((angle * Math.PI) / 180)

  return (
    <div data-testid="tank-gauge" data-color={color} className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <line x1="60" y1="60" x2={needleX} y2={needleY} stroke={COLOR_HEX[color]} strokeWidth="4" />
      </svg>
      <div className="text-sm font-medium">{tank.gasType}</div>
      <div className="text-xs text-gray-500">{tank.assignedMeter ?? 'Unassigned'}</div>
      <div className="text-lg font-bold" style={{ color: COLOR_HEX[color] }}>
        {tank.psi} psi ({Math.round(pct)}%)
      </div>
    </div>
  )
}
