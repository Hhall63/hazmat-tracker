import './globals.css'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import { getRepository } from '@/lib/repositoryFactory'
import { getMergedSettings } from '@/lib/settings/settingsService'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getMergedSettings(getRepository())
  return {
    title: settings.branding.tabTitle,
    manifest: '/manifest.json',
  }
}

export const viewport: Viewport = {
  themeColor: '#0a1120',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink">{children}</body>
    </html>
  )
}
