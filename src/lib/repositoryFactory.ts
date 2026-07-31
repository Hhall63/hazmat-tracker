import type { Repository } from './repository'
import { SupabaseRepository } from './supabaseRepository'

let testOverride: Repository | null = null

export function __setRepositoryForTests(repo: Repository | null): void {
  testOverride = repo
}

export function getRepository(): Repository {
  if (testOverride) return testOverride
  return new SupabaseRepository()
}
