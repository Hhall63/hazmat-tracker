import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'

export const dynamic = 'force-dynamic'

export async function GET() {
  const repo = getRepository()
  return NextResponse.json(await repo.getCustomQrCodes())
}
