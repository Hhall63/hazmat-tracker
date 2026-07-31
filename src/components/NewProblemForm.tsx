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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description, createdBy: updatedBy }),
    })
    setSubmitting(false)
    setDescription('')
    onAdded()
  }

  return (
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
  )
}
