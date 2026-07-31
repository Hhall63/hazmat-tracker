import type { Repository } from '../repository'
import type { LogEntry } from '../types'

export async function addProblemNote(
  repo: Repository,
  description: string,
  createdBy: string
): Promise<LogEntry> {
  return repo.insertLogEntry({
    createdBy,
    entryType: 'problem_note',
    description,
  })
}

export async function resolveProblemNote(repo: Repository, id: string): Promise<LogEntry> {
  return repo.resolveLogEntry(id)
}
