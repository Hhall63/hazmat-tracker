'use client'

import { DashboardHeader } from '@/components/DashboardHeader'
import { NewProblemForm } from '@/components/NewProblemForm'
import { useLocalName } from '@/hooks/useLocalName'

export default function ScanProblemPage() {
  const [name, setName] = useLocalName()

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-sm space-y-4 p-6 text-ink">
        <label className="block text-sm text-ink-dim">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink"
          />
        </label>

        <h2 className="text-lg font-bold">Log a Problem</h2>
        <NewProblemForm updatedBy={name} onAdded={() => {}} />
      </main>
    </div>
  )
}
