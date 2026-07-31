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
          className="flex-1 border px-2 py-1"
        />
        <button
          type="submit"
          disabled={submitting || !updatedBy}
          className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          Log problem
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
