import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { addTank } from '@/lib/services/tankService'
import type { NewTankInput } from '@/lib/types'

export async function GET() {
  const repo = getRepository()
  const tanks = await repo.getTanks()
  return NextResponse.json(tanks)
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as NewTankInput
  const repo = getRepository()
  const tank = await addTank(repo, body)
  return NextResponse.json(tank, { status: 201 })
}
