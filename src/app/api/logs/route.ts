import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { addProblemNote } from '@/lib/services/logService'

export async function GET() {
  const repo = getRepository()
  const entries = await repo.getLogEntries()
  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { description: string; createdBy: string }
  const repo = getRepository()
  const entry = await addProblemNote(repo, body.description, body.createdBy)
  return NextResponse.json(entry, { status: 201 })
}
