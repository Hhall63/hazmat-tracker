import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/auth/session'

const ALWAYS_ALLOW = ['/admin/login', '/api/admin/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (ALWAYS_ALLOW.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const secret = process.env.ADMIN_SESSION_SECRET ?? ''
  const token = request.cookies.get('hazmat_admin')?.value
  const ok = token ? await verifySessionToken(token, secret, Date.now()) : false
  if (ok) return NextResponse.next()

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/admin/login'
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
