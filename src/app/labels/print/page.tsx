'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SingleLabelPrint } from '@/components/SingleLabelPrint'

function PrintInner() {
  const params = useSearchParams()
  const value = params.get('value') ?? ''
  const title = params.get('title') ?? ''
  const subtitle = params.get('subtitle') ?? undefined

  if (!value) {
    return <p className="p-6 text-ink-dim">No label to print.</p>
  }
  return (
    <main className="mx-auto max-w-2xl p-6 text-ink print:p-0">
      <h2 className="mb-4 text-xl font-bold print:hidden">Print label</h2>
      <SingleLabelPrint value={value} title={title} subtitle={subtitle} />
    </main>
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintInner />
    </Suspense>
  )
}
