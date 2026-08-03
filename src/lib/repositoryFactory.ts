import type { Repository } from './repository'
import { SupabaseRepository } from './supabaseRepository'
import { getSupabaseAdminClient } from './supabaseAdminClient'

let testOverride: Repository | null = null
let adminTestOverride: Repository | null = null

export function __setRepositoryForTests(repo: Repository | null): void {
  testOverride = repo
}

export function __setAdminRepositoryForTests(repo: Repository | null): void {
  adminTestOverride = repo
}

export function getRepository(): Repository {
  if (testOverride) return testOverride
  return new SupabaseRepository()
}

export function getAdminRepository(): Repository {
  if (adminTestOverride) return adminTestOverride
  return new SupabaseRepository(getSupabaseAdminClient())
}
