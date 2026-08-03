'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/DashboardHeader'

export default function LoginPage() {
  const router = useRouter()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      if (!res.ok) throw new Error('bad')
      router.replace('/admin')
    } catch {
      setError('Incorrect passcode.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader subtitle="Admin" />
      <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-16">
        <div className="rounded-lg border border-gold/20 bg-panel p-6 shadow-lg shadow-black/30">
          <h2 className="text-lg font-bold text-gold-bright">Admin access</h2>
          <p className="mt-1 text-sm text-ink-dim">Enter the shared passcode to edit app content.</p>
          <label htmlFor="passcode" className="mt-5 block text-sm text-ink-dim">
            Passcode
            <input
              id="passcode"
              type="password"
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && passcode && !submitting && submit()}
              className="mt-1 block w-full rounded border border-gold/20 bg-bg px-3 py-2 text-ink outline-none focus:border-gold"
            />
          </label>
          {error && <p className="mt-3 text-sm text-status-red">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting || !passcode}
            className="mt-5 w-full rounded bg-gold px-4 py-3 font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Checking…' : 'Enter'}
          </button>
        </div>
      </main>
    </div>
  )
}
