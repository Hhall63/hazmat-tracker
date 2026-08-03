import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { getMergedSettings } from '@/lib/settings/settingsService'

// Always read live DB state; never statically cache this response.
export const dynamic = 'force-dynamic'

export async function GET() {
  const repo = getRepository()
  const settings = await getMergedSettings(repo)
  return NextResponse.json(settings)
}
