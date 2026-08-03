import { describe, it, expect, afterEach, vi } from 'vitest'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-sans' }),
  IBM_Plex_Mono: () => ({ variable: '--font-mono' }),
}))

afterEach(() => __setRepositoryForTests(null))

describe('generateMetadata', () => {
  it('uses the settings tab title', async () => {
    const repo = new InMemoryRepository()
    await repo.saveSettings(
      // minimal: rely on merge to fill the rest
      (await import('@/lib/settings/types')).DEFAULT_SETTINGS,
      'seed'
    )
    __setRepositoryForTests(repo)
    const { generateMetadata } = await import('./layout')
    const meta = await generateMetadata()
    expect(meta.title).toBe('HAZMAT Inventory Dashboard')
  })
})
