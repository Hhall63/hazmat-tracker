'use client'

export function SaveBar({
  onSave,
  saving,
  error,
  savedAt,
}: {
  onSave: () => void
  saving: boolean
  error: string
  savedAt: number | null
}) {
  return (
    <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-gold/20 bg-bg/90 py-3 backdrop-blur">
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded bg-gold px-4 py-2 font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      {error && <span className="text-sm text-status-red">{error}</span>}
      {!error && savedAt && <span className="text-sm text-status-green">Saved</span>}
    </div>
  )
}
