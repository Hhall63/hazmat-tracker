# QR Label Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Label maker" flow that creates a tank/equipment item and prints its QR as one physically-sized thermal label, and lets any existing code be printed the same way.

**Architecture:** A pure `labelSize` helper maps a physical size (preset or custom in/mm) to a CSS `@page` size + QR pixel size. A shared `<QrLabel>` renders one label card (used by both the `/labels` grid and the single-label view). A self-contained `/labels/print` page renders `<SingleLabelPrint>` from query params (`value`, `title`, `subtitle`) — so only the label is on the page and thermal printing is clean. `/labels/new` is the create form that POSTs to the existing create routes then routes to `/labels/print`. `/labels` gets a "＋ New label" link and a per-card "Print label" link.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, `qrcode` (existing), vitest + @testing-library/react.

## Global Constraints

- No new dependency, DB table, migration, or API route — reuse `POST /api/equipment`, `POST /api/tanks`, `QrCode`, `scanUrl`, `useAppSettings`, `useLocalName`.
- Any new live-data GET route must set `export const dynamic = 'force-dynamic'`. (N/A here — no new API routes.)
- Never export non-handlers from a `route.ts`. (N/A here.)
- Remembered-name localStorage key is `hazmat-dashboard-name` via `useLocalName`.
- Equipment categories: `meter_detector | ppe | tools_misc` (labels via `CATEGORY_LABELS`). Equipment statuses: `in_service | out_of_service | retired`. Tank statuses: `in_use | spare | retired`.

---

### Task 1: `labelSize` pure helper

**Files:**
- Create: `src/lib/labelSize.ts`
- Test: `src/lib/labelSize.test.ts`

**Interfaces:**
- Produces:
  - `LABEL_PRESETS: ReadonlyArray<{ key: string; label: string; w: number; h: number; unit: 'in' }>`
  - `interface LabelSelection { preset: string; customW?: number; customH?: number; unit?: 'in' | 'mm' }`
  - `interface LabelDimensions { widthCss: string; heightCss: string; pageSize: string; qrPx: number }`
  - `function resolveLabelDimensions(sel: LabelSelection): LabelDimensions`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { resolveLabelDimensions, LABEL_PRESETS } from './labelSize'

describe('resolveLabelDimensions', () => {
  it('maps a known preset to inch CSS + a page size string', () => {
    const d = resolveLabelDimensions({ preset: '2x1' })
    expect(d.widthCss).toBe('2in')
    expect(d.heightCss).toBe('1in')
    expect(d.pageSize).toBe('2in 1in')
    expect(d.qrPx).toBeGreaterThan(0)
  })

  it('sizes the QR from the smaller dimension (~0.8x, 96px/in)', () => {
    // 1in min * 96 * 0.8 = 76.8 -> 77
    expect(resolveLabelDimensions({ preset: '2x1' }).qrPx).toBe(77)
  })

  it('handles a custom size in millimetres', () => {
    const d = resolveLabelDimensions({ preset: 'custom', customW: 50, customH: 30, unit: 'mm' })
    expect(d.widthCss).toBe('50mm')
    expect(d.heightCss).toBe('30mm')
    expect(d.pageSize).toBe('50mm 30mm')
    // min 30mm = 30/25.4 in * 96 * 0.8 = 90.7 -> 91
    expect(d.qrPx).toBe(91)
  })

  it('falls back to the first preset for an unknown key', () => {
    const d = resolveLabelDimensions({ preset: 'nope' })
    expect(d.pageSize).toBe(`${LABEL_PRESETS[0].w}in ${LABEL_PRESETS[0].h}in`)
  })

  it('never returns a QR smaller than 48px', () => {
    const d = resolveLabelDimensions({ preset: 'custom', customW: 5, customH: 5, unit: 'mm' })
    expect(d.qrPx).toBe(48)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/labelSize.test.ts`
Expected: FAIL — module not found / `resolveLabelDimensions` undefined.

- [ ] **Step 3: Write minimal implementation**

```ts
export const LABEL_PRESETS = [
  { key: '1x1', label: '1" × 1"', w: 1, h: 1, unit: 'in' },
  { key: '1.5x1', label: '1.5" × 1"', w: 1.5, h: 1, unit: 'in' },
  { key: '2x1', label: '2" × 1"', w: 2, h: 1, unit: 'in' },
  { key: '2x2', label: '2" × 2"', w: 2, h: 2, unit: 'in' },
  { key: '4x6', label: '4" × 6"', w: 4, h: 6, unit: 'in' },
] as const

export interface LabelSelection {
  preset: string
  customW?: number
  customH?: number
  unit?: 'in' | 'mm'
}

export interface LabelDimensions {
  widthCss: string
  heightCss: string
  pageSize: string
  qrPx: number
}

const PX_PER_IN = 96
const MIN_QR_PX = 48

function qrPxFor(w: number, h: number, unit: 'in' | 'mm'): number {
  const inMin = unit === 'mm' ? Math.min(w, h) / 25.4 : Math.min(w, h)
  return Math.max(MIN_QR_PX, Math.round(inMin * PX_PER_IN * 0.8))
}

export function resolveLabelDimensions(sel: LabelSelection): LabelDimensions {
  if (sel.preset === 'custom') {
    const unit = sel.unit ?? 'in'
    const w = sel.customW && sel.customW > 0 ? sel.customW : 1
    const h = sel.customH && sel.customH > 0 ? sel.customH : 1
    return {
      widthCss: `${w}${unit}`,
      heightCss: `${h}${unit}`,
      pageSize: `${w}${unit} ${h}${unit}`,
      qrPx: qrPxFor(w, h, unit),
    }
  }
  const p = LABEL_PRESETS.find((x) => x.key === sel.preset) ?? LABEL_PRESETS[0]
  return {
    widthCss: `${p.w}in`,
    heightCss: `${p.h}in`,
    pageSize: `${p.w}in ${p.h}in`,
    qrPx: qrPxFor(p.w, p.h, 'in'),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/labelSize.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/labelSize.ts src/lib/labelSize.test.ts
git commit -m "feat: labelSize helper — physical size -> @page + QR px"
```

---

### Task 2: `<QrLabel>` shared card + refactor `/labels` grid to use it

**Files:**
- Create: `src/components/QrLabel.tsx`
- Modify: `src/app/labels/page.tsx` (replace the inline `card()` body with `<QrLabel>`)
- Test: existing `src/app/labels/page.test.tsx` must still pass.

**Interfaces:**
- Consumes: `QrCode` from `@/components/QrCode`.
- Produces: `function QrLabel(props: { value: string; title: string; subtitle?: string; qrSize: number; showLogo: boolean; badgeImageUrl: string; footerText: string }): JSX.Element`

- [ ] **Step 1: Write the component**

```tsx
import { QrCode } from '@/components/QrCode'

export function QrLabel({
  value,
  title,
  subtitle,
  qrSize,
  showLogo,
  badgeImageUrl,
  footerText,
}: {
  value: string
  title: string
  subtitle?: string
  qrSize: number
  showLogo: boolean
  badgeImageUrl: string
  footerText: string
}) {
  return (
    <div className="rounded border border-gold/20 bg-panel p-3 text-center print:border-black print:bg-white">
      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={badgeImageUrl} alt="" className="mx-auto mb-2 h-8 w-auto" />
      )}
      <QrCode value={value} size={qrSize} />
      <p className="mt-2 text-sm">{title}</p>
      {subtitle && <p className="text-xs text-ink-dim">{subtitle}</p>}
      {footerText && <p className="mt-1 text-xs text-ink-dim print:text-black">{footerText}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Refactor `/labels` `card()` to use `<QrLabel>`**

Replace the `card` helper in `src/app/labels/page.tsx` with:

```tsx
const { size, showLogo, footerText } = settings.labels
const qrSize = QR_SIZE[size]

const card = (key: string, value: string, title: string, subtitle?: string) => (
  <QrLabel
    key={key}
    value={value}
    title={title}
    subtitle={subtitle}
    qrSize={qrSize}
    showLogo={showLogo}
    badgeImageUrl={settings.branding.badgeImageUrl}
    footerText={footerText}
  />
)
```

Add the import at top: `import { QrLabel } from '@/components/QrLabel'`.

- [ ] **Step 3: Run the labels test to verify still green**

Run: `npx vitest run src/app/labels/page.test.tsx`
Expected: PASS (both existing tests — Oxygen / SCBA / Log a Problem / Print All still render).

- [ ] **Step 4: Commit**

```bash
git add src/components/QrLabel.tsx src/app/labels/page.tsx
git commit -m "refactor: extract shared QrLabel used by the labels grid"
```

---

### Task 3: `<SingleLabelPrint>` — size selector + preview + sized print

**Files:**
- Create: `src/components/SingleLabelPrint.tsx`
- Test: `src/components/SingleLabelPrint.test.tsx`

**Interfaces:**
- Consumes: `resolveLabelDimensions`, `LABEL_PRESETS` from `@/lib/labelSize`; `QrLabel`; `useAppSettings`.
- Produces: `function SingleLabelPrint(props: { value: string; title: string; subtitle?: string }): JSX.Element`

Behaviour: preset dropdown + custom W×H + in/mm toggle; remembers last selection in `localStorage` key `hazmat-label-size`; a **Print** button injects `@page { size: <pageSize>; margin: 0 }` into a `<style id="label-page-size">` then calls `window.print()`. The label preview is wrapped so print CSS shows only it (`.print-only-label`).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SingleLabelPrint } from './SingleLabelPrint'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}))

beforeEach(() => {
  window.localStorage.clear()
})

describe('SingleLabelPrint', () => {
  it('renders the title and a size selector', () => {
    render(<SingleLabelPrint value="https://x/scan/equipment/1" title="MultiRAE" />)
    expect(screen.getByText('MultiRAE')).toBeInTheDocument()
    expect(screen.getByLabelText('Label size')).toBeInTheDocument()
  })

  it('injects an @page size and calls window.print on Print', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<SingleLabelPrint value="v" title="T" />)
    fireEvent.click(screen.getByText('Print label'))
    const style = document.getElementById('label-page-size')
    expect(style?.textContent).toContain('@page')
    expect(style?.textContent).toContain('size:')
    expect(printSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SingleLabelPrint.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useAppSettings } from '@/hooks/useAppSettings'
import { QrLabel } from '@/components/QrLabel'
import { resolveLabelDimensions, LABEL_PRESETS, type LabelSelection } from '@/lib/labelSize'

const STORAGE_KEY = 'hazmat-label-size'

export function SingleLabelPrint({
  value,
  title,
  subtitle,
}: {
  value: string
  title: string
  subtitle?: string
}) {
  const settings = useAppSettings()
  const [sel, setSel] = useState<LabelSelection>({ preset: '2x1', unit: 'in' })

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSel(JSON.parse(stored))
      } catch {
        /* ignore bad json */
      }
    }
  }, [])

  const update = (next: LabelSelection) => {
    setSel(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const dims = resolveLabelDimensions(sel)

  function print() {
    let style = document.getElementById('label-page-size') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'label-page-size'
      document.head.appendChild(style)
    }
    style.textContent = `@page { size: ${dims.pageSize}; margin: 0 } @media print { body * { visibility: hidden } .print-only-label, .print-only-label * { visibility: visible } .print-only-label { position: fixed; inset: 0 } }`
    window.print()
  }

  const field = 'rounded border border-gold/20 bg-panel px-2 py-1 text-ink'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col text-sm text-ink-dim">
          Label size
          <select
            aria-label="Label size"
            className={field}
            value={sel.preset}
            onChange={(e) => update({ ...sel, preset: e.target.value })}
          >
            {LABEL_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </label>
        {sel.preset === 'custom' && (
          <>
            <label className="flex flex-col text-sm text-ink-dim">
              Width
              <input
                aria-label="Custom width"
                type="number"
                min={0.1}
                step={0.1}
                className={field}
                value={sel.customW ?? ''}
                onChange={(e) => update({ ...sel, customW: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col text-sm text-ink-dim">
              Height
              <input
                aria-label="Custom height"
                type="number"
                min={0.1}
                step={0.1}
                className={field}
                value={sel.customH ?? ''}
                onChange={(e) => update({ ...sel, customH: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col text-sm text-ink-dim">
              Unit
              <select
                aria-label="Unit"
                className={field}
                value={sel.unit ?? 'in'}
                onChange={(e) => update({ ...sel, unit: e.target.value as 'in' | 'mm' })}
              >
                <option value="in">inches</option>
                <option value="mm">mm</option>
              </select>
            </label>
          </>
        )}
        <button onClick={print} className="rounded bg-gold px-3 py-1 text-bg">
          Print label
        </button>
      </div>

      <div
        className="print-only-label mx-auto flex items-center justify-center"
        style={{ width: dims.widthCss, height: dims.heightCss }}
      >
        <QrLabel
          value={value}
          title={title}
          subtitle={subtitle}
          qrSize={dims.qrPx}
          showLogo={settings.labels.showLogo}
          badgeImageUrl={settings.branding.badgeImageUrl}
          footerText={settings.labels.footerText}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/SingleLabelPrint.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/SingleLabelPrint.tsx src/components/SingleLabelPrint.test.tsx
git commit -m "feat: SingleLabelPrint — sized preview + @page thermal print"
```

---

### Task 4: `/labels/print` page (renders SingleLabelPrint from query params)

**Files:**
- Create: `src/app/labels/print/page.tsx`
- Test: `src/app/labels/print/page.test.tsx`

**Interfaces:**
- Consumes: `SingleLabelPrint`. Reads `useSearchParams()` — `value`, `title`, `subtitle`.
- Produces: default-exported page component. Wrapped in `<Suspense>` (Next 14 requires it for `useSearchParams`).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrintPage from './page'

vi.mock('@/hooks/useAppSettings', async () => {
  const mod = (await vi.importActual('@/lib/settings/types')) as typeof import('@/lib/settings/types')
  return { useAppSettings: () => mod.DEFAULT_SETTINGS }
})
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('value=v&title=MultiRAE&subtitle=Meter'),
}))

describe('labels/print page', () => {
  it('renders the label for the query params', async () => {
    render(<PrintPage />)
    expect(await screen.findByText('MultiRAE')).toBeInTheDocument()
    expect(screen.getByText('Meter')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/labels/print/page.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/labels/print/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/labels/print/page.tsx src/app/labels/print/page.test.tsx
git commit -m "feat: /labels/print single-label print page"
```

---

### Task 5: `/labels/new` Label maker form

**Files:**
- Create: `src/app/labels/new/page.tsx`
- Test: `src/app/labels/new/page.test.tsx`

**Interfaces:**
- Consumes: `useLocalName`, `useRouter` (next/navigation), `EQUIPMENT_CATEGORIES`, `CATEGORY_LABELS`, `TANK_STATUSES`, `EQUIPMENT_STATUSES`, `equipmentScanPath`/`tankScanPath`/`toAbsoluteUrl`.
- Behaviour: type toggle (equipment/tank); on submit POST to the matching route, take the returned item `id`, build the absolute scan URL, `router.push('/labels/print?value=…&title=…&subtitle=…')`. Inline error on failure; submit disabled until name present.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewLabelPage from './page'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

beforeEach(() => {
  push.mockClear()
  window.localStorage.setItem('hazmat-dashboard-name', 'J. Smith')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'eq-9', name: 'MultiRAE', category: 'meter_detector' }),
    })),
  )
  vi.stubGlobal('location', { origin: 'https://hazmat.example' } as unknown as Location)
})

describe('NewLabelPage', () => {
  it('creates equipment then routes to the print page with the scan URL', async () => {
    render(<NewLabelPage />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'MultiRAE' } })
    fireEvent.click(screen.getByText('Create & make label'))
    await waitFor(() => expect(push).toHaveBeenCalled())
    const url = push.mock.calls[0][0] as string
    expect(url).toContain('/labels/print?')
    expect(url).toContain('value=')
    expect(url).toContain('scan%2Fequipment%2Feq-9')
    expect(url).toContain('title=MultiRAE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/labels/new/page.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalName } from '@/hooks/useLocalName'
import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES, TANK_STATUSES } from '@/lib/types'
import type { EquipmentCategory, TankStatus } from '@/lib/types'
import { equipmentScanPath, tankScanPath, toAbsoluteUrl } from '@/lib/scanUrl'

type Kind = 'equipment' | 'tank'

export default function NewLabelPage() {
  const router = useRouter()
  const [name, setName] = useLocalName()
  const [kind, setKind] = useState<Kind>('equipment')
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState<EquipmentCategory>('meter_detector')
  const [gasType, setGasType] = useState('')
  const [assignedMeter, setAssignedMeter] = useState('')
  const [psi, setPsi] = useState(2000)
  const [maxPsi, setMaxPsi] = useState(2200)
  const [tankStatus, setTankStatus] = useState<TankStatus>('spare')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const origin = window.location.origin
      let value: string
      let title: string
      let subtitle: string | undefined
      if (kind === 'equipment') {
        const r = await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: itemName, category, status: 'in_service', createdBy: name }),
        })
        if (!r.ok) throw new Error('create failed')
        const item = await r.json()
        value = toAbsoluteUrl(equipmentScanPath(item.id), origin)
        title = item.name
      } else {
        const r = await fetch('/api/tanks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            gasType,
            assignedMeter: assignedMeter || null,
            psi,
            maxPsi,
            status: tankStatus,
            createdBy: name,
          }),
        })
        if (!r.ok) throw new Error('create failed')
        const item = await r.json()
        value = toAbsoluteUrl(tankScanPath(item.id), origin)
        title = item.gasType
        subtitle = item.assignedMeter ?? undefined
      }
      const q = new URLSearchParams({ value, title })
      if (subtitle) q.set('subtitle', subtitle)
      router.push(`/labels/print?${q.toString()}`)
    } catch {
      setError('Could not create the item — check the fields and try again.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink'
  const canSubmit = !!name && (kind === 'equipment' ? !!itemName : !!gasType)

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6 text-ink">
      <h2 className="text-xl font-bold">Label maker</h2>

      <div className="flex gap-2">
        {(['equipment', 'tank'] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded px-3 py-1 ${kind === k ? 'bg-gold text-bg' : 'bg-panel text-ink-dim'}`}
          >
            {k === 'equipment' ? 'Equipment' : 'Tank'}
          </button>
        ))}
      </div>

      <label className="block text-sm text-ink-dim">
        Your name
        <input aria-label="Your name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      {kind === 'equipment' ? (
        <>
          <label className="block text-sm text-ink-dim">
            Name
            <input aria-label="Name" className={field} value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </label>
          <label className="block text-sm text-ink-dim">
            Category
            <select
              aria-label="Category"
              className={field}
              value={category}
              onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
            >
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm text-ink-dim">
            Gas type
            <input aria-label="Gas type" className={field} value={gasType} onChange={(e) => setGasType(e.target.value)} />
          </label>
          <label className="block text-sm text-ink-dim">
            Assigned meter
            <input
              aria-label="Assigned meter"
              className={field}
              value={assignedMeter}
              onChange={(e) => setAssignedMeter(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <label className="block text-sm text-ink-dim">
              PSI
              <input aria-label="PSI" type="number" className={field} value={psi} onChange={(e) => setPsi(Number(e.target.value))} />
            </label>
            <label className="block text-sm text-ink-dim">
              Max PSI
              <input aria-label="Max PSI" type="number" className={field} value={maxPsi} onChange={(e) => setMaxPsi(Number(e.target.value))} />
            </label>
          </div>
          <label className="block text-sm text-ink-dim">
            Status
            <select
              aria-label="Status"
              className={field}
              value={tankStatus}
              onChange={(e) => setTankStatus(e.target.value as TankStatus)}
            >
              {TANK_STATUSES.filter((s) => s !== 'retired').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <button
        onClick={submit}
        disabled={busy || !canSubmit}
        className="rounded bg-gold px-4 py-2 text-bg disabled:opacity-50"
      >
        Create &amp; make label
      </button>
      {error && <p className="text-sm text-status-red">{error}</p>}
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/labels/new/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/labels/new/page.tsx src/app/labels/new/page.test.tsx
git commit -m "feat: /labels/new Label maker form"
```

---

### Task 6: Wire `/labels` — "＋ New label" link + per-card "Print label"

**Files:**
- Modify: `src/app/labels/page.tsx`
- Test: `src/app/labels/page.test.tsx` (add assertions)

**Interfaces:**
- Consumes: `next/link`. Builds per-card print links `/labels/print?value=…&title=…&subtitle=…` using the same `value`/`title`/`subtitle` the grid already computes.

- [ ] **Step 1: Add a print-link helper + "＋ New label" button**

In `src/app/labels/page.tsx`, add `import Link from 'next/link'`. Add a helper next to `card`:

```tsx
const printHref = (value: string, title: string, subtitle?: string) => {
  const q = new URLSearchParams({ value, title })
  if (subtitle) q.set('subtitle', subtitle)
  return `/labels/print?${q.toString()}`
}
```

Change the header actions block to include the New-label link (keep Print All):

```tsx
<div className="flex items-center gap-2 print:hidden">
  <Link href="/labels/new" className="rounded border border-gold/40 px-3 py-1 text-gold">
    ＋ New label
  </Link>
  <button onClick={() => window.print()} className="rounded bg-gold px-3 py-1 text-bg">
    Print All
  </button>
</div>
```

- [ ] **Step 2: Wrap each grid card with a per-card "Print label" link**

Replace each `card(...)` call site so each item renders the card plus a print link. Extract a small local wrapper:

```tsx
const cell = (key: string, value: string, title: string, subtitle?: string) => (
  <div key={key} className="space-y-1">
    {card(key, value, title, subtitle)}
    <Link
      href={printHref(value, title, subtitle)}
      className="block text-center text-xs text-gold underline print:hidden"
    >
      Print label
    </Link>
  </div>
)
```

Then in the grid use `cell(...)` instead of `card(...)` for problem/tanks/equipment/customCodes. Note `card` still needs its own `key`; keeping `key` on both the wrapper `div` (cell) and inner is fine — React only requires it on the array element (the `div` in `cell`). Remove `key` duplication warnings by keeping `key` on the `cell` div only; `card`'s `key` prop is harmless but drop it if lint complains.

- [ ] **Step 3: Update the labels test**

Add to `src/app/labels/page.test.tsx` inside the existing `describe`:

```tsx
it('offers a New label link and per-card Print label links', async () => {
  render(<LabelsPage />)
  await screen.findByText('Oxygen')
  expect(screen.getByText('＋ New label').closest('a')).toHaveAttribute('href', '/labels/new')
  expect(screen.getAllByText('Print label').length).toBeGreaterThan(0)
})
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/app/labels/page.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/labels/page.tsx src/app/labels/page.test.tsx
git commit -m "feat: labels page — New label + per-card Print label links"
```

---

### Task 7: Full green + build

- [ ] **Step 1: Run the whole suite**

Run: `npx vitest run`
Expected: all files pass (prior 198 + the new tests).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exit 0, no prerender errors. (Watch `/labels/print` — the `Suspense` wrapper around `useSearchParams` is what keeps the build from failing.)

- [ ] **Step 3: Commit any lint/build fixups**

```bash
git add -A
git commit -m "chore: build green for label maker" || echo "nothing to commit"
```

---

## Self-Review

- **Spec coverage:** `/labels/new` create form (Task 5) ✓; single-label sized print + presets/custom in-mm (Tasks 1,3) ✓; reachable from every existing card (Task 6) ✓; both tanks & equipment (Task 5) ✓; general problem code + custom codes printable (Task 6 wraps every card incl. problem + customCodes) ✓; reuse of QrCode/scanUrl/settings/create routes (Tasks 2–5) ✓; no new dep/table/route ✓; localStorage size persistence (Task 3) ✓; error handling (Task 5 inline error; QrCode fallback pre-existing) ✓; tests (each task) ✓.
- **Placeholder scan:** none — every step has full code.
- **Type consistency:** `resolveLabelDimensions`/`LabelSelection`/`LabelDimensions` used consistently across Tasks 1,3; `QrLabel` prop shape identical in Tasks 2,3; scan-URL helpers used as defined.
