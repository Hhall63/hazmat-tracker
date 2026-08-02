import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from '../repository'
import { getMergedSettings, saveMergedSettings } from './settingsService'
import { DEFAULT_SETTINGS } from './types'

describe('settingsService', () => {
  it('returns defaults when nothing is stored', async () => {
    const repo = new InMemoryRepository()
    expect(await getMergedSettings(repo)).toEqual(DEFAULT_SETTINGS)
  })

  it('persists a full merged object and returns it', async () => {
    const repo = new InMemoryRepository()
    const saved = await saveMergedSettings(repo, { branding: { title: 'RRT 5' } }, 'Chief')
    expect(saved.branding.title).toBe('RRT 5')
    expect(saved.headings).toEqual(DEFAULT_SETTINGS.headings)
    // stored value is the full merged object, so later reads are complete
    expect(await getMergedSettings(repo)).toEqual(saved)
  })
})
