export function DashboardHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="flex items-center gap-3 border-b-2 border-gold bg-gradient-to-b from-panel to-bg px-5 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/gfd-badge.png" alt="Greensboro Fire Department badge" className="h-10 w-auto" />
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wide text-gold-bright">
          HAZMAT Inventory
        </h1>
        {subtitle && <p className="text-[11px] text-ink-dim">{subtitle}</p>}
      </div>
    </header>
  )
}
