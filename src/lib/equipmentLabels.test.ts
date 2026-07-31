import { describe, it, expect } from 'vitest'
import { CATEGORY_LABELS } from './equipmentLabels'

describe('CATEGORY_LABELS', () => {
  it('has a display label for every category', () => {
    expect(CATEGORY_LABELS).toEqual({
      meter_detector: 'Meters & Detectors',
      ppe: 'PPE',
      tools_misc: 'Tools & Misc',
    })
  })
})
