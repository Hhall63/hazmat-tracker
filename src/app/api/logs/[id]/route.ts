import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { resolveProblemNote } from '@/lib/services/logService'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const repo = getRepository()
  const entry = await resolveProblemNote(repo, params.id)
  return NextResponse.json(entry)
}
