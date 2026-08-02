import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useValueHighlight } from './useValueHighlight'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useValueHighlight', () => {
  it('starts false on initial render', () => {
    const { result } = renderHook(({ value }) => useValueHighlight(value), {
      initialProps: { value: 100 },
    })
    expect(result.current).toBe(false)
  })

  it('becomes true when the value changes, then false again after 600ms', () => {
    const { result, rerender } = renderHook(({ value }) => useValueHighlight(value), {
      initialProps: { value: 100 },
    })

    rerender({ value: 200 })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(result.current).toBe(false)
  })

  it('stays false when rerendered with the same value', () => {
    const { result, rerender } = renderHook(({ value }) => useValueHighlight(value), {
      initialProps: { value: 100 },
    })

    rerender({ value: 100 })
    expect(result.current).toBe(false)
  })
})
