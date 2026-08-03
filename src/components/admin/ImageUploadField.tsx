'use client'

import { useState } from 'react'

export function ImageUploadField({
  label,
  currentUrl,
  onUploaded,
}: {
  label: string
  currentUrl: string
  onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('upload failed')
      const { url } = await res.json()
      onUploaded(url)
    } catch {
      setError('Upload failed — check the file and try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-dim">{label}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={currentUrl} alt={label} className="h-16 w-auto rounded border border-gold/20 bg-panel p-1" />
      <input
        type="file"
        aria-label={`Upload ${label}`}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="block text-sm text-ink"
      />
      {uploading && <p className="text-sm text-ink-dim">Uploading…</p>}
      {error && <p className="text-sm text-status-red">{error}</p>}
    </div>
  )
}
