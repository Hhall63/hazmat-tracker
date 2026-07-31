import { describe, it, expect } from 'vitest'
import { psiPercentage, gaugeColor, gaugeNeedleAngleDegrees } from './gauge'

describe('psiPercentage', () => {
  it('computes a simple percentage', () => {
    expect(psiPercentage(1108, 2216)).toBe(50)
  })

  it('clamps below zero to zero', () => {
    expect(psiPercentage(-100, 2216)).toBe(0)
  })

  it('clamps above max to 100', () => {
    expect(psiPercentage(3000, 2216)).toBe(100)
  })

  it('returns 0 when maxPsi is zero', () => {
    expect(psiPercentage(100, 0)).toBe(0)
  })

  it('returns 0 when maxPsi is negative', () => {
    expect(psiPercentage(100, -2216)).toBe(0)
  })
})

describe('gaugeColor', () => {
  it('is red at or below 25%', () => {
    expect(gaugeColor(554, 2216)).toBe('red')
  })

  it('is yellow between 25% and 50%', () => {
    expect(gaugeColor(1000, 2216)).toBe('yellow')
  })

  it('is yellow at exactly 50% (boundary)', () => {
    expect(gaugeColor(1108, 2216)).toBe('yellow')
  })

  it('is green above 50%', () => {
    expect(gaugeColor(2000, 2216)).toBe('green')
  })

  it('is red when psi is clamped below zero', () => {
    expect(gaugeColor(-100, 2216)).toBe('red')
  })

  it('is green when psi is clamped above max', () => {
    expect(gaugeColor(3000, 2216)).toBe('green')
  })
})

describe('gaugeNeedleAngleDegrees', () => {
  it('points to -90 degrees at 0%', () => {
    expect(gaugeNeedleAngleDegrees(0, 2216)).toBe(-90)
  })

  it('points to 0 degrees at 50%', () => {
    expect(gaugeNeedleAngleDegrees(1108, 2216)).toBe(0)
  })

  it('points to 90 degrees at 100%', () => {
    expect(gaugeNeedleAngleDegrees(2216, 2216)).toBe(90)
  })

  it('points to -90 degrees when psi is clamped below zero', () => {
    expect(gaugeNeedleAngleDegrees(-100, 2216)).toBe(-90)
  })

  it('points to 90 degrees when psi is clamped above max', () => {
    expect(gaugeNeedleAngleDegrees(3000, 2216)).toBe(90)
  })
})
