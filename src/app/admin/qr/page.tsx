'use client'

import { useEffect, useState } from 'react'
import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'
import { QrCode } from '@/components/QrCode'
import type { CustomQrCode } from '@/lib/types'
import type { AppSettings, LabelSettings } from '@/lib/settings/types'

const SIZES: LabelSettings['size'][] = ['small', 'medium', 'large']

export default function QrPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()
  const [codes, setCodes] = useState<CustomQrCode[]>([])
  const [label, setLabel] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const loadCodes = async () => {
    const r = await fetch('/api/custom-qr')
    if (r.ok) setCodes(await r.json())
  }
  useEffect(() => { loadCodes() }, [])

  async function addCode() {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/admin/custom-qr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label, targetUrl }),
      })
      if (!r.ok) throw new Error('failed')
      setLabel(''); setTargetUrl('')
      await loadCodes()
    } catch {
      setErr('Could not add code — check the URL and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function removeCode(id: string) {
    const r = await fetch(`/api/admin/custom-qr/${id}`, { method: 'DELETE' })
    if (r.ok) await loadCodes()
  }

  const setLabels = (patch: Partial<AppSettings['labels']>) =>
    setSettings({ ...settings, labels: { ...settings.labels, ...patch } })
  const field = 'mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink'

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gold-bright">QR codes &amp; labels</h2>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gold">Custom standalone codes</h3>
        <label className="block text-sm text-ink-dim">Code label
          <input aria-label="Code label" className={field} value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="block text-sm text-ink-dim">Target URL
          <input aria-label="Target URL" className={field} value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
        </label>
        {err && <p className="text-sm text-status-red">{err}</p>}
        <button onClick={addCode} disabled={busy || !label || !targetUrl}
          className="rounded bg-gold px-4 py-2 font-bold text-bg disabled:opacity-50">Add code</button>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {codes.map((c) => (
            <div key={c.id} className="rounded border border-gold/20 bg-panel p-3 text-center">
              <QrCode value={c.targetUrl} />
              <p className="mt-1 text-sm">{c.label}</p>
              <button onClick={() => removeCode(c.id)} className="text-xs text-status-red underline">Delete</button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gold">Label appearance</h3>
        <label className="block text-sm text-ink-dim">Size
          <select aria-label="Label size" className={field} value={settings.labels.size}
            onChange={(e) => setLabels({ size: e.target.value as LabelSettings['size'] })}>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" aria-label="Show logo on labels" checked={settings.labels.showLogo}
            onChange={(e) => setLabels({ showLogo: e.target.checked })} />
          Show logo on labels
        </label>
        <label className="block text-sm text-ink-dim">Footer text
          <input aria-label="Label footer text" className={field} value={settings.labels.footerText}
            onChange={(e) => setLabels({ footerText: e.target.value })} />
        </label>
        <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
      </section>
    </div>
  )
}
