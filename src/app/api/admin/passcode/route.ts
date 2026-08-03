import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'
import { hashPasscode } from '@/lib/auth/passcode'

export async function PUT(request: Request) {
  const { newPasscode } = (await request.json()) as { newPasscode?: string }
  if (!newPasscode || newPasscode.length < 4) {
    return NextResponse.json({ error: 'passcode must be at least 4 characters' }, { status: 400 })
  }
  const repo = getAdminRepository()
  await repo.setAdminPasscodeHash(hashPasscode(newPasscode))
  return NextResponse.json({ ok: true })
}
