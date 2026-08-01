'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'
import { chooseDensityTier, type DensityTier } from '@/lib/densityTier'

export function useAutoDensity(
  containerRef: RefObject<HTMLElement>,
  viewportHeight: number
): DensityTier {
  const [tier, setTier] = useState<DensityTier>('comfortable')

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const next = chooseDensityTier(el.scrollHeight, viewportHeight, tier)
    if (next) setTier(next)
  }, [viewportHeight])

  return tier
}
