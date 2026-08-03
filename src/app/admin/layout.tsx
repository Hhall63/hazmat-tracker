'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DashboardHeader } from '@/components/DashboardHeader'

const NAV = [
  { href: '/admin/branding', label: 'Branding' },
  { href: '/admin/images', label: 'Images' },
  { href: '/admin/layout-board', label: 'Layout & Board' },
  { href: '/admin/scan-actions', label: 'Scan Actions' },
  { href: '/admin/qr', label: 'QR Codes' },
  { href: '/admin/passcode', label: 'Passcode' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // The login page is a standalone screen and must not render the admin chrome.
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader subtitle="Admin" />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:flex-row">
        <nav className="flex flex-wrap gap-2 md:w-48 md:flex-col">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded border px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-gold bg-gold/10 font-semibold text-gold-bright'
                    : 'border-gold/20 bg-panel text-ink hover:border-gold'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <main className="flex-1 text-ink">{children}</main>
      </div>
    </div>
  )
}
