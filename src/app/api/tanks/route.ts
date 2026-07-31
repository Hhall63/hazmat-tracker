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
  if (!body.gasType || !body.createdBy) {
    return NextResponse.json({ error: 'gasType and createdBy are required' }, { status: 400 })
  }
  if (!Number.isFinite(body.psi) || !Number.isFinite(body.maxPsi)) {
    return NextResponse.json({ error: 'psi and maxPsi must be numbers' }, { status: 400 })
  }
  const repo = getRepository()
  const tank = await addTank(repo, body)
  return NextResponse.json(tank, { status: 201 })
}
