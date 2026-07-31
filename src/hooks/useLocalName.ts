'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'hazmat-dashboard-name'

export function useLocalName(): [string, (name: string) => void] {
  const [name, setName] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) setName(stored)
  }, [])

  function updateName(next: string) {
    setName(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return [name, updateName]
}
