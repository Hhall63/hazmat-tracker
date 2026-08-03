'use client'

import { useState } from 'react'

export default function PasscodePage() {
  const [newPasscode, setNewPasscode] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function update() {
    setStatus(''); setError('')
    try {
      const res = await fetch('/api/admin/passcode', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPasscode }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('Passcode updated.')
      setNewPasscode('')
    } catch {
      setError('Could not update passcode (min 4 characters).')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gold-bright">Change passcode</h2>
      <label className="block text-sm text-ink-dim">New passcode
        <input aria-label="New passcode" type="password" value={newPasscode}
          onChange={(e) => setNewPasscode(e.target.value)}
          className="mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink" />
      </label>
      {error && <p className="text-sm text-status-red">{error}</p>}
      {status && <p className="text-sm text-status-green">{status}</p>}
      <button onClick={update} disabled={newPasscode.length < 4}
        className="rounded bg-gold px-4 py-2 font-bold text-bg disabled:opacity-50">Update passcode</button>
    </div>
  )
}
