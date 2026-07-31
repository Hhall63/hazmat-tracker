export function psiPercentage(psi: number, maxPsi: number): number {
  if (maxPsi <= 0) return 0
  const pct = (psi / maxPsi) * 100
  return Math.min(100, Math.max(0, pct))
}

export type GaugeColor = 'red' | 'yellow' | 'green'

export function gaugeColor(psi: number, maxPsi: number): GaugeColor {
  const pct = psiPercentage(psi, maxPsi)
  if (pct <= 25) return 'red'
  if (pct <= 50) return 'yellow'
  return 'green'
}

export function gaugeNeedleAngleDegrees(psi: number, maxPsi: number): number {
  const pct = psiPercentage(psi, maxPsi)
  return -90 + (pct / 100) * 180
}
