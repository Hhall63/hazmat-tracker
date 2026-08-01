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
    const { result, rerender } = renderWithHeight(2200, 1920)
    rerender()
    expect(result.current).toBe('compact')
  })
})
