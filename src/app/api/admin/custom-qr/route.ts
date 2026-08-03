import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'

export async function POST(request: Request) {
  const { label, targetUrl } = (await request.json()) as { label?: string; targetUrl?: string }
  if (!label || !targetUrl) {
    return NextResponse.json({ error: 'label and targetUrl are required' }, { status: 400 })
  }
  const repo = getAdminRepository()
  const code = await repo.insertCustomQrCode({ label, targetUrl, createdBy: 'admin' })
  return NextResponse.json(code, { status: 201 })
}
