import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLocalName } from './useLocalName'

describe('useLocalName', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts empty when nothing is stored', () => {
    const { result } = renderHook(() => useLocalName())
    expect(result.current[0]).toBe('')
  })

  it('persists the name to localStorage and reflects it in state', () => {
    const { result } = renderHook(() => useLocalName())
    act(() => {
      result.current[1]('J. Smith')
    })
    expect(result.current[0]).toBe('J. Smith')
    expect(window.localStorage.getItem('hazmat-dashboard-name')).toBe('J. Smith')
  })

  it('reads a previously stored name on mount', () => {
    window.localStorage.setItem('hazmat-dashboard-name', 'A. Lee')
    const { result } = renderHook(() => useLocalName())
    expect(result.current[0]).toBe('A. Lee')
  })
})
