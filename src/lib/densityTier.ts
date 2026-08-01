export const DENSITY_TIERS = ['comfortable', 'compact', 'dense'] as const
export type DensityTier = (typeof DENSITY_TIERS)[number]

export function chooseDensityTier(
  contentHeight: number,
  viewportHeight: number,
  currentTier: DensityTier
): DensityTier | null {
  if (contentHeight <= viewportHeight) return null

  const currentIndex = DENSITY_TIERS.indexOf(currentTier)
  const nextTier = DENSITY_TIERS[currentIndex + 1]
  return nextTier ?? null
}
