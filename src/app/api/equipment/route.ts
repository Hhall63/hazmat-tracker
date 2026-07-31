import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { addEquipmentItem } from '@/lib/services/equipmentService'
import type { NewEquipmentInput } from '@/lib/types'

export async function GET() {
  const repo = getRepository()
  const items = await repo.getEquipmentItems()
  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as NewEquipmentInput
  const repo = getRepository()
  const item = await addEquipmentItem(repo, body)
  return NextResponse.json(item, { status: 201 })
}
