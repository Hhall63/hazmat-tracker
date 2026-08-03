import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'
import { saveMergedSettings } from '@/lib/settings/settingsService'

export async function PUT(request: Request) {
  const incoming = await request.json()
  const repo = getAdminRepository()
  const merged = await saveMergedSettings(repo, incoming, 'admin')
  return NextResponse.json(merged)
}
