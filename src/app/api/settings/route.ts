import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { getMergedSettings } from '@/lib/settings/settingsService'

export async function GET() {
  const repo = getRepository()
  const settings = await getMergedSettings(repo)
  return NextResponse.json(settings)
}
