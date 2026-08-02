'use client'

import { useAppSettings } from '@/hooks/useAppSettings'

export function DashboardHeader({ subtitle }: { subtitle?: string }) {
  const settings = useAppSettings()
  const shownSubtitle = subtitle ?? settings.branding.subtitle
  return (
    <header className="flex items-center gap-3 border-b-2 border-gold bg-gradient-to-b from-panel to-bg px-5 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={settings.branding.badgeImageUrl}
        alt="Greensboro Fire Department badge"
        className="h-10 w-auto"
      />
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wide text-gold-bright">
          {settings.branding.title}
        </h1>
        {shownSubtitle && <p className="text-[11px] text-ink-dim">{shownSubtitle}</p>}
      </div>
    </header>
  )
}
