import './globals.css'
import type { ReactNode } from 'react'
import { Inter, IBM_Plex_Mono } from 'next/font/google'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' })

export const metadata = {
  title: 'HAZMAT Inventory Dashboard',
  themeColor: '#0a1120',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink">{children}</body>
    </html>
  )
}
