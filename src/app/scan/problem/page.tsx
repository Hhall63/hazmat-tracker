'use client'

import { DashboardHeader } from '@/components/DashboardHeader'
import { NewProblemForm } from '@/components/NewProblemForm'
import { useLocalName } from '@/hooks/useLocalName'

export default function ScanProblemPage() {
  const [name] = useLocalName()

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-sm space-y-4 p-6 text-ink">
        <h2 className="text-lg font-bold">Log a Problem</h2>
        <NewProblemForm updatedBy={name} onAdded={() => {}} />
      </main>
    </div>
  )
}
