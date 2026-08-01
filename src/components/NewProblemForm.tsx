'use client'

import { useState } from 'react'

export function NewProblemForm({
  updatedBy,
  onAdded,
}: {
  updatedBy: string
  onAdded: () => void
}) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description, createdBy: updatedBy }),
    })
    setSubmitting(false)
    if (!response.ok) {
      setError('Failed to save — please try again.')
      return
    }
    setDescription('')
    onAdded()
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the problem"
          required
          className="flex-1 rounded border border-gold/20 bg-panel px-2 py-1 text-ink"
        />
        <button
          type="submit"
          disabled={submitting || !updatedBy}
          className="rounded bg-status-red px-3 py-1 text-ink disabled:opacity-50"
        >
          Log problem
        </button>
      </form>
      {error && <p className="text-sm text-status-red">{error}</p>}
    </div>
  )
}
