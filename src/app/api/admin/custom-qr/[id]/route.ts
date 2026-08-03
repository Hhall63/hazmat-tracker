import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const repo = getAdminRepository()
  await repo.deleteCustomQrCode(params.id)
  return NextResponse.json({ ok: true })
}
