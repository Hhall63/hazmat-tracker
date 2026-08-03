import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'
import { verifyPasscode } from '@/lib/auth/passcode'
import { signSessionToken } from '@/lib/auth/session'

// Not exported: Next.js route modules may only export HTTP handlers + route config.
const ADMIN_COOKIE = 'hazmat_admin'
const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function POST(request: Request) {
  const { passcode } = (await request.json()) as { passcode?: string }
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return NextResponse.json({ error: 'server not configured' }, { status: 500 })
  if (!passcode) return NextResponse.json({ error: 'passcode required' }, { status: 400 })

  const repo = getAdminRepository()
  const stored = await repo.getAdminPasscodeHash()
  if (!stored || !verifyPasscode(passcode, stored)) {
    return NextResponse.json({ error: 'invalid passcode' }, { status: 401 })
  }

  const token = await signSessionToken(secret, Date.now())
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  })
  return res
}
