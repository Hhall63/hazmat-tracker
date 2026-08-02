'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-panel text-center text-xs text-status-red"
      >
        Failed to generate QR
      </div>
    )
  }

  if (!dataUrl) return <div style={{ width: size, height: size }} className="bg-panel" />

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt={`QR code for ${value}`} width={size} height={size} />
}
