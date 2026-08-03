import { describe, it, expect } from 'vitest'
import { validateUpload } from './validate'

describe('validateUpload', () => {
  it('accepts a small png', () => {
    expect(validateUpload('image/png', 1000)).toBeNull()
  })
  it('rejects an unsupported type', () => {
    expect(validateUpload('application/pdf', 1000)).toMatch(/type/i)
  })
  it('rejects files over 2MB', () => {
    expect(validateUpload('image/png', 3_000_000)).toMatch(/large/i)
  })
})
