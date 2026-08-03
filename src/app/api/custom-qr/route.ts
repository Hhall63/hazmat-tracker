import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'

export async function GET() {
  const repo = getRepository()
  return NextResponse.json(await repo.getCustomQrCodes())
}
