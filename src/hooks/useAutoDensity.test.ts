import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useAutoDensity } from './useAutoDensity'

function renderWithHeight(scrollHeight: number, viewportHeight: number) {
  return renderHook(() => {
    const ref = useRef<HTMLDivElement>(null)
    if (!ref.current) {
      // Simulate a mounted element by attaching a fake node with the given scrollHeight.
      const el = document.createElement('div')
      Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
      ;(ref as { current: HTMLDivElement }).current = el
    }
    return useAutoDensity(ref, viewportHeight)
  })
}

describe('useAutoDensity', () => {
  it('stays at comfortable when content fits', () => {
    const { result } = renderWithHeight(1000, 1920)
    expect(result.current).toBe('comfortable')
  })

  it('steps down to compact when content overflows comfortable', () => {
    // scrollHeight shrinks once the tier steps to 'compact', simulating a
    // real re-render with denser content that then fits the viewport.
    let readCount = 0
    const heightsByRead = [2200, 1800] // comfortable-run (overflows), compact-run (fits)
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', {
      get: () => heightsByRead[Math.min(readCount++, heightsByRead.length - 1)],
      configurable: true,
    })

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(el)
      return useAutoDensity(ref, 1920)
    })

    expect(result.current).toBe('compact')
  })

  it('steps down through multiple tiers in one settle when content keeps overflowing', () => {
    let readCount = 0
    const heightsByRead = [3000, 2200, 1800] // comfortable-run, compact-run (still over), dense-run (fits)
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', {
      get: () => heightsByRead[Math.min(readCount++, heightsByRead.length - 1)],
      configurable: true,
    })

    const { result, rerender } = renderHook(
      ({ viewportHeight }) => {
        const ref = useRef<HTMLDivElement>(el)
        return useAutoDensity(ref, viewportHeight)
      },
      { initialProps: { viewportHeight: 1920 } }
    )

    rerender({ viewportHeight: 1920 })
    rerender({ viewportHeight: 1920 })

    expect(result.current).toBe('dense')
  })
})
