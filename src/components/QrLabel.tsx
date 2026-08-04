import { QrCode } from '@/components/QrCode'

export function QrLabel({
  value,
  title,
  subtitle,
  qrSize,
  showLogo,
  badgeImageUrl,
  footerText,
}: {
  value: string
  title: string
  subtitle?: string
  qrSize: number
  showLogo: boolean
  badgeImageUrl: string
  footerText: string
}) {
  return (
    <div className="rounded border border-gold/20 bg-panel p-3 text-center print:border-black print:bg-white">
      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={badgeImageUrl} alt="" className="mx-auto mb-2 h-8 w-auto" />
      )}
      <QrCode value={value} size={qrSize} />
      <p className="mt-2 text-sm">{title}</p>
      {subtitle && <p className="text-xs text-ink-dim">{subtitle}</p>}
      {footerText && <p className="mt-1 text-xs text-ink-dim print:text-black">{footerText}</p>}
    </div>
  )
}
