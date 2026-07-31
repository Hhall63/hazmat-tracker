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
})

describe('gaugeColor', () => {
  it('is red at or below 25%', () => {
    expect(gaugeColor(554, 2216)).toBe('red')
  })

  it('is yellow between 25% and 50%', () => {
    expect(gaugeColor(1000, 2216)).toBe('yellow')
  })

  it('is green above 50%', () => {
    expect(gaugeColor(2000, 2216)).toBe('green')
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
})
