import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { applyTankUpdate } from '@/lib/services/tankService'
import type { TankStatus } from '@/lib/types'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { psi?: number; status?: TankStatus; updatedBy: string }
  const repo = getRepository()
  const tank = await applyTankUpdate(
    repo,
    params.id,
    { psi: body.psi, status: body.status },
    body.updatedBy
  )
  return NextResponse.json(tank)
}
