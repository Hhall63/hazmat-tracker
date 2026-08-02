'use client'

import { useEffect, useRef, useState } from 'react'

export function useValueHighlight<T>(value: T): boolean {
  const previous = useRef(value)
  const [highlighted, setHighlighted] = useState(false)

  useEffect(() => {
    if (previous.current === value) return
    previous.current = value
    setHighlighted(true)
    const timeout = setTimeout(() => setHighlighted(false), 600)
    return () => clearTimeout(timeout)
  }, [value])

  return highlighted
}
