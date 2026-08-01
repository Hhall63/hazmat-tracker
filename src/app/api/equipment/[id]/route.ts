import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { applyEquipmentStatusChange } from '@/lib/services/equipmentService'
import type { EquipmentStatus } from '@/lib/types'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const repo = getRepository()
  const item = await repo.getEquipmentItem(params.id)
  if (!item) {
    return NextResponse.json({ error: 'Equipment item not found' }, { status: 404 })
  }
  return NextResponse.json(item)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { status: EquipmentStatus; updatedBy: string }
  const repo = getRepository()
  const item = await applyEquipmentStatusChange(repo, params.id, body.status, body.updatedBy)
  return NextResponse.json(item)
}
