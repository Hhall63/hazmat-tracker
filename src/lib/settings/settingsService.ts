import type { Repository } from '../repository'
import { deepMerge, mergeSettings } from './mergeSettings'
import type { AppSettings } from './types'

export async function getMergedSettings(repo: Repository): Promise<AppSettings> {
  const stored = await repo.getSettings()
  return mergeSettings(stored)
}

export async function saveMergedSettings(
  repo: Repository,
  incoming: unknown,
  updatedBy: string
): Promise<AppSettings> {
  const current = await getMergedSettings(repo)
  const merged = mergeSettings(deepMerge(current, incoming))
  await repo.saveSettings(merged, updatedBy)
  return merged
}
