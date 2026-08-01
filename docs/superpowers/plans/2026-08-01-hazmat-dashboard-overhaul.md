# HAZMAT Dashboard Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the HAZMAT dashboard's presentation as three branded surfaces — an always-on `/board` display (1080×1920), a redesigned interactive Command Center (`/`, `/log`, `/labels`), and a QR-driven phone quick-action flow (`/scan/...`) — per `docs/superpowers/specs/2026-07-31-hazmat-dashboard-overhaul-design.md`.

**Architecture:** A shared design-token layer (Tailwind colors/fonts) and a small set of shared presentational components (`DashboardHeader`, `StatBar`, redesigned `TankGauge`/`ProblemsBanner`) are built first, then reused across all three surfaces. The Board adds a runtime density-measurement hook; the scan flow adds two new GET endpoints and three new routes; QR generation is client-side only (no schema changes).

**Tech Stack:** Next.js 14 (App Router, TS), Tailwind CSS, Vitest + Testing Library, `qrcode` (new dependency) for client-side QR rendering, `next/font/google` for typography.

## Global Constraints

- Color tokens (from the design spec, use exactly): `bg #0a1120`, `panel #10192d`, `panel2 #16223b`, `border rgba(205,163,73,0.20)`, `gold #cda349`, `gold-bright #e6c479`, `status-red #d21f3c`, `status-amber #f2b705`, `status-green #34d399`, `ink #eef2f7`, `ink-dim #92a1b8`.
- Typography: geometric sans (Inter) for UI text, monospace (IBM Plex Mono) for PSI/stat numbers only.
- No changes to the Supabase schema or the `Repository`/`Tank`/`EquipmentItem`/`LogEntry` shapes in `src/lib/types.ts` — the design spec requires zero schema changes.
- All existing tests must keep passing except where a task explicitly updates an assertion to match an intentional, spec-approved behavior change (called out per task).
- Follow the existing repo conventions: `@/*` path alias to `src/*`, Vitest + Testing Library, one `*.test.ts(x)` file alongside each new non-trivial module, `InMemoryRepository` + `__setRepositoryForTests` for route tests.

---

### Task 1: Design tokens and branding assets

**Files:**
- Modify: `tailwind.config.ts`
- Create: `public/gfd-badge.png` (copy of `C:\Users\ffhal\Downloads\GFD-removebg-preview.png`)
- Create: `public/hazmat-emblem.png` (copy of `C:\Users\ffhal\Downloads\11 & 21.png`)

**Interfaces:**
- Produces: Tailwind color tokens `bg`, `panel`, `panel2`, `gold` (+ `gold-bright`), `status-red`/`status-amber`/`status-green`, `ink` (+ `ink-dim`), and a `border-gold`-based hairline convention (`border-gold/20`), used by every later task.

- [ ] **Step 1: Copy branding assets into `public/`**

```bash
cp "C:\Users\ffhal\Downloads\GFD-removebg-preview.png" "public/gfd-badge.png"
cp "C:\Users\ffhal\Downloads\11 & 21.png" "public/hazmat-emblem.png"
```

- [ ] **Step 2: Extend Tailwind config with the token palette**

Replace `tailwind.config.ts` with:

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a1120',
        panel: '#10192d',
        panel2: '#16223b',
        gold: {
          DEFAULT: '#cda349',
          bright: '#e6c479',
        },
        status: {
          red: '#d21f3c',
          amber: '#f2b705',
          green: '#34d399',
        },
        ink: {
          DEFAULT: '#eef2f7',
          dim: '#92a1b8',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Verify the build picks up the config**

Run: `npm run build`
Expected: build succeeds (no component uses the new tokens yet, so this only validates the config file is syntactically valid and Tailwind doesn't error).

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts public/gfd-badge.png "public/hazmat-emblem.png"
git commit -m "Add branding assets and design token palette"
```

---

### Task 2: Fonts and global chrome

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Tailwind tokens from Task 1 (`bg`, `ink`).
- Produces: `font-sans`/`font-mono` utility classes usable by every component from here on; `<body>` carries the dark background/ink text as the app-wide default.

- [ ] **Step 1: Load fonts and apply base chrome in `layout.tsx`**

Replace `src/app/layout.tsx` with:

```tsx
import './globals.css'
import type { ReactNode } from 'react'
import { Inter, IBM_Plex_Mono } from 'next/font/google'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' })

export const metadata = {
  title: 'HAZMAT Inventory Dashboard',
  themeColor: '#0a1120',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Confirm `globals.css` still only holds Tailwind directives (no change needed)**

Read `src/app/globals.css` and confirm it is exactly:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

If it already matches, no edit needed for this step.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS (no test asserts on layout markup yet).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "Apply dark theme chrome and load Inter/IBM Plex Mono fonts"
```

---

### Task 3: `computeDashboardStats` pure function

**Files:**
- Create: `src/lib/dashboardStats.ts`
- Test: `src/lib/dashboardStats.test.ts`

**Interfaces:**
- Consumes: `Tank`, `EquipmentItem`, `LogEntry` from `@/lib/types`; `gaugeColor` from `@/lib/gauge`.
- Produces: `computeDashboardStats(tanks, equipment, logEntries): DashboardStats` where `DashboardStats = { openProblems: number; lowTanks: number; equipmentInService: number; equipmentTotal: number }`. Consumed by Task 4 (`StatBar`).

- [ ] **Step 1: Write the failing test**

Create `src/lib/dashboardStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeDashboardStats } from './dashboardStats'
import type { EquipmentItem, LogEntry, Tank } from './types'

function tank(overrides: Partial<Tank> = {}): Tank {
  return {
    id: '1',
    gasType: 'Oxygen',
    assignedMeter: null,
    psi: 2000,
    maxPsi: 2200,
    status: 'in_use',
    lastUpdatedBy: 'A',
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function equipment(overrides: Partial<EquipmentItem> = {}): EquipmentItem {
  return {
    id: '1',
    name: 'SCBA',
    category: 'meter_detector',
    status: 'in_service',
    lastUpdatedBy: 'A',
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function problem(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: '1',
    createdAt: new Date().toISOString(),
    createdBy: 'A',
    entryType: 'problem_note',
    description: 'issue',
    resolved: false,
    ...overrides,
  }
}

describe('computeDashboardStats', () => {
  it('returns zeros for empty input', () => {
    expect(computeDashboardStats([], [], [])).toEqual({
      openProblems: 0,
      lowTanks: 0,
      equipmentInService: 0,
      equipmentTotal: 0,
    })
  })

  it('counts only unresolved problem notes', () => {
    const stats = computeDashboardStats(
      [],
      [],
      [problem({ resolved: false }), problem({ id: '2', resolved: true })]
    )
    expect(stats.openProblems).toBe(1)
  })

  it('counts an in-use tank as low only when its gauge is not green', () => {
    const stats = computeDashboardStats(
      [
        tank({ id: 'a', psi: 200, maxPsi: 2200, status: 'in_use' }), // red
        tank({ id: 'b', psi: 2100, maxPsi: 2200, status: 'in_use' }), // green
      ],
      [],
      []
    )
    expect(stats.lowTanks).toBe(1)
  })

  it('never counts spare or retired tanks as low, even at low psi', () => {
    const stats = computeDashboardStats(
      [
        tank({ id: 'a', psi: 100, maxPsi: 2200, status: 'spare' }),
        tank({ id: 'b', psi: 100, maxPsi: 2200, status: 'retired' }),
      ],
      [],
      []
    )
    expect(stats.lowTanks).toBe(0)
  })

  it('counts in-service equipment and excludes retired items from the total', () => {
    const stats = computeDashboardStats(
      [],
      [
        equipment({ id: 'a', status: 'in_service' }),
        equipment({ id: 'b', status: 'out_of_service' }),
        equipment({ id: 'c', status: 'retired' }),
      ],
      []
    )
    expect(stats.equipmentInService).toBe(1)
    expect(stats.equipmentTotal).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/dashboardStats.test.ts`
Expected: FAIL — `Cannot find module './dashboardStats'`

- [ ] **Step 3: Implement `computeDashboardStats`**

Create `src/lib/dashboardStats.ts`:

```ts
import { gaugeColor } from './gauge'
import type { EquipmentItem, LogEntry, Tank } from './types'

export interface DashboardStats {
  openProblems: number
  lowTanks: number
  equipmentInService: number
  equipmentTotal: number
}

export function computeDashboardStats(
  tanks: Tank[],
  equipment: EquipmentItem[],
  logEntries: LogEntry[]
): DashboardStats {
  const openProblems = logEntries.filter(
    (e) => e.entryType === 'problem_note' && !e.resolved
  ).length

  const lowTanks = tanks.filter(
    (t) => t.status === 'in_use' && gaugeColor(t.psi, t.maxPsi) !== 'green'
  ).length

  const activeEquipment = equipment.filter((e) => e.status !== 'retired')
  const equipmentInService = activeEquipment.filter((e) => e.status === 'in_service').length

  return {
    openProblems,
    lowTanks,
    equipmentInService,
    equipmentTotal: activeEquipment.length,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/dashboardStats.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboardStats.ts src/lib/dashboardStats.test.ts
git commit -m "Add computeDashboardStats pure function"
```

---

### Task 4: `StatTile` and `StatBar` components

**Files:**
- Create: `src/components/ui/StatTile.tsx`
- Create: `src/components/ui/StatBar.tsx`
- Test: `src/components/ui/StatBar.test.tsx`

**Interfaces:**
- Consumes: `computeDashboardStats` from `@/lib/dashboardStats` (Task 3); `Tank`, `EquipmentItem`, `LogEntry` types.
- Produces: `<StatBar tanks={Tank[]} equipment={EquipmentItem[]} logEntries={LogEntry[]} />`, a `data-testid="stat-bar"` root element. Consumed by Task 10 (Board) and Task 11 (Command Center shell).

- [ ] **Step 1: Write `StatTile`**

Create `src/components/ui/StatTile.tsx`:

```tsx
export type StatTone = 'bad' | 'warn' | 'ok' | 'neutral'

const TONE_CLASSES: Record<StatTone, string> = {
  bad: 'text-status-red',
  warn: 'text-status-amber',
  ok: 'text-status-green',
  neutral: 'text-gold-bright',
}

export function StatTile({
  value,
  label,
  tone = 'neutral',
}: {
  value: number
  label: string
  tone?: StatTone
}) {
  return (
    <div className="rounded-lg border border-gold/20 bg-panel px-3 py-2">
      <div className={`font-mono text-2xl font-extrabold leading-none ${TONE_CLASSES[tone]}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-ink-dim">{label}</div>
    </div>
  )
}
```

- [ ] **Step 2: Write the failing test for `StatBar`**

Create `src/components/ui/StatBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatBar } from './StatBar'
import type { EquipmentItem, LogEntry, Tank } from '@/lib/types'

describe('StatBar', () => {
  it('renders open problems, low tanks, and equipment in service counts', () => {
    const tanks: Tank[] = [
      {
        id: '1',
        gasType: 'Oxygen',
        assignedMeter: null,
        psi: 200,
        maxPsi: 2200,
        status: 'in_use',
        lastUpdatedBy: 'A',
        lastUpdatedAt: new Date().toISOString(),
      },
    ]
    const equipment: EquipmentItem[] = [
      {
        id: '1',
        name: 'SCBA',
        category: 'meter_detector',
        status: 'in_service',
        lastUpdatedBy: 'A',
        lastUpdatedAt: new Date().toISOString(),
      },
    ]
    const logEntries: LogEntry[] = [
      {
        id: '1',
        createdAt: new Date().toISOString(),
        createdBy: 'A',
        entryType: 'problem_note',
        description: 'issue',
        resolved: false,
      },
    ]

    render(<StatBar tanks={tanks} equipment={equipment} logEntries={logEntries} />)

    expect(screen.getByTestId('stat-bar')).toBeInTheDocument()
    expect(screen.getByText('Open Problems')).toBeInTheDocument()
    expect(screen.getByText('Tanks Low')).toBeInTheDocument()
    expect(screen.getByText('Equipment In Service')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(3)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/ui/StatBar.test.tsx`
Expected: FAIL — `Cannot find module './StatBar'`

- [ ] **Step 4: Implement `StatBar`**

Create `src/components/ui/StatBar.tsx`:

```tsx
import { computeDashboardStats } from '@/lib/dashboardStats'
import type { EquipmentItem, LogEntry, Tank } from '@/lib/types'
import { StatTile } from './StatTile'

export function StatBar({
  tanks,
  equipment,
  logEntries,
}: {
  tanks: Tank[]
  equipment: EquipmentItem[]
  logEntries: LogEntry[]
}) {
  const stats = computeDashboardStats(tanks, equipment, logEntries)
  return (
    <div className="grid grid-cols-3 gap-2" data-testid="stat-bar">
      <StatTile
        value={stats.openProblems}
        label="Open Problems"
        tone={stats.openProblems > 0 ? 'bad' : 'ok'}
      />
      <StatTile
        value={stats.lowTanks}
        label="Tanks Low"
        tone={stats.lowTanks > 0 ? 'warn' : 'ok'}
      />
      <StatTile value={stats.equipmentInService} label="Equipment In Service" tone="ok" />
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/StatBar.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/StatTile.tsx src/components/ui/StatBar.tsx src/components/ui/StatBar.test.tsx
git commit -m "Add StatTile and StatBar components"
```

---

### Task 5: Redesign `TankGauge`

**Files:**
- Modify: `src/components/TankGauge.tsx`
- Test: `src/components/TankGauge.test.tsx` (existing — must keep passing unchanged)

**Interfaces:**
- Consumes: `gaugeColor`, `gaugeNeedleAngleDegrees`, `psiPercentage` from `@/lib/gauge` (unchanged).
- Produces: same public contract as before — `<TankGauge tank={Tank} />`, root `data-testid="tank-gauge"` with `data-color` matching `gaugeColor` output. No prop or test changes.

- [ ] **Step 1: Confirm the existing test still describes the contract to preserve**

Read `src/components/TankGauge.test.tsx` — it asserts `data-testid="tank-gauge"`, `data-color` attribute, and the gas type / assigned meter text render. Do not change this file.

- [ ] **Step 2: Replace the gauge visual**

Replace `src/components/TankGauge.tsx` with:

```tsx
import { gaugeColor, gaugeNeedleAngleDegrees, psiPercentage } from '@/lib/gauge'
import type { Tank } from '@/lib/types'

const ZONE_HEX: Record<'red' | 'yellow' | 'green', string> = {
  red: '#d21f3c',
  yellow: '#f2b705',
  green: '#34d399',
}

export function TankGauge({ tank }: { tank: Tank }) {
  const color = gaugeColor(tank.psi, tank.maxPsi)
  const angle = gaugeNeedleAngleDegrees(tank.psi, tank.maxPsi)
  const pct = psiPercentage(tank.psi, tank.maxPsi)
  const needleX = 60 + 45 * Math.sin((angle * Math.PI) / 180)
  const needleY = 60 - 45 * Math.cos((angle * Math.PI) / 180)

  return (
    <div
      data-testid="tank-gauge"
      data-color={color}
      className="flex flex-col items-center rounded-lg border border-gold/20 bg-panel px-3 py-2"
    >
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path
          d="M10,60 A50,50 0 0 1 40,15"
          fill="none"
          stroke={ZONE_HEX.red}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M40,15 A50,50 0 0 1 80,15"
          fill="none"
          stroke={ZONE_HEX.yellow}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M80,15 A50,50 0 0 1 110,60"
          fill="none"
          stroke={ZONE_HEX.green}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <line x1="60" y1="60" x2={needleX} y2={needleY} stroke="#eef2f7" strokeWidth="3" />
      </svg>
      <div className="text-sm font-semibold text-ink">{tank.gasType}</div>
      <div className="text-xs text-ink-dim">{tank.assignedMeter ?? 'Unassigned'}</div>
      <div className="font-mono text-lg font-extrabold" style={{ color: ZONE_HEX[color] }}>
        {tank.psi} psi ({Math.round(pct)}%)
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the existing test to confirm it still passes unchanged**

Run: `npx vitest run src/components/TankGauge.test.tsx`
Expected: PASS (both existing tests, no edits made to the test file)

- [ ] **Step 4: Commit**

```bash
git add src/components/TankGauge.tsx
git commit -m "Redesign TankGauge with zone-band arc and branded colors"
```

---

### Task 6: `DashboardHeader` shared component

**Files:**
- Create: `src/components/DashboardHeader.tsx`
- Test: `src/components/DashboardHeader.test.tsx`

**Interfaces:**
- Produces: `<DashboardHeader subtitle?: string />`. Consumed by Task 10 (Board), Task 11 (Command Center), and Tasks 19–21 (scan pages).

- [ ] **Step 1: Write the failing test**

Create `src/components/DashboardHeader.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardHeader } from './DashboardHeader'

describe('DashboardHeader', () => {
  it('renders the crest image and title', () => {
    render(<DashboardHeader />)
    expect(screen.getByAltText('Greensboro Fire Department badge')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /hazmat inventory/i })).toBeInTheDocument()
  })

  it('renders an optional subtitle', () => {
    render(<DashboardHeader subtitle="Engine 11 · Ladder 21 · RRT 5" />)
    expect(screen.getByText('Engine 11 · Ladder 21 · RRT 5')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/DashboardHeader.test.tsx`
Expected: FAIL — `Cannot find module './DashboardHeader'`

- [ ] **Step 3: Implement `DashboardHeader`**

Create `src/components/DashboardHeader.tsx`:

```tsx
export function DashboardHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="flex items-center gap-3 border-b-2 border-gold bg-gradient-to-b from-panel to-bg px-5 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/gfd-badge.png" alt="Greensboro Fire Department badge" className="h-10 w-auto" />
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wide text-gold-bright">
          HAZMAT Inventory
        </h1>
        {subtitle && <p className="text-[11px] text-ink-dim">{subtitle}</p>}
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/DashboardHeader.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DashboardHeader.tsx src/components/DashboardHeader.test.tsx
git commit -m "Add shared DashboardHeader component"
```

---

### Task 7: Update `ProblemsBanner` — render nothing when clear, restyle otherwise

**Files:**
- Modify: `src/components/ProblemsBanner.tsx`
- Modify: `src/components/ProblemsBanner.test.tsx`

**Interfaces:**
- Consumes: `LogEntry` type, `formatFootnote` from `@/lib/formatFootnote` (unchanged).
- Produces: `<ProblemsBanner latestProblem={LogEntry | null} />` — **behavior change**: returns `null` (renders nothing) when `latestProblem` is `null`, instead of a "No open problems." placeholder. This matches the approved design spec: absence of the banner is the good-state signal on the Board.

- [ ] **Step 1: Update the test to assert the new behavior**

Replace `src/components/ProblemsBanner.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProblemsBanner } from './ProblemsBanner'
import type { LogEntry } from '@/lib/types'

describe('ProblemsBanner', () => {
  it('renders nothing when there are no open problems', () => {
    const { container } = render(<ProblemsBanner latestProblem={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the description and a name/date footnote', () => {
    const entry: LogEntry = {
      id: '1',
      createdAt: '2026-07-30T18:00:00.000Z',
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    }
    render(<ProblemsBanner latestProblem={entry} />)
    expect(screen.getByText('Decon pump leaking')).toBeInTheDocument()
    expect(screen.getByText('— J. Smith, Jul 30')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify the "renders nothing" case fails against the old implementation**

Run: `npx vitest run src/components/ProblemsBanner.test.tsx`
Expected: FAIL on the first test — old implementation renders "No open problems."

- [ ] **Step 3: Implement the new `ProblemsBanner`**

Replace `src/components/ProblemsBanner.tsx` with:

```tsx
import { formatFootnote } from '@/lib/formatFootnote'
import type { LogEntry } from '@/lib/types'

export function ProblemsBanner({ latestProblem }: { latestProblem: LogEntry | null }) {
  if (!latestProblem) return null

  return (
    <section
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-status-red/50 bg-status-red/10 px-4 py-3"
    >
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-status-red font-black text-bg">
        !
      </span>
      <div>
        <div className="text-sm font-bold text-ink">{latestProblem.description}</div>
        <div className="text-xs text-ink-dim">{formatFootnote(latestProblem)}</div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ProblemsBanner.test.tsx`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ProblemsBanner.tsx src/components/ProblemsBanner.test.tsx
git commit -m "ProblemsBanner renders nothing when clear; restyle to branded alert"
```

---

### Task 8: `chooseDensityTier` pure function

**Files:**
- Create: `src/lib/densityTier.ts`
- Test: `src/lib/densityTier.test.ts`

**Interfaces:**
- Produces: `type DensityTier = 'comfortable' | 'compact' | 'dense'`, `chooseDensityTier(contentHeight: number, viewportHeight: number, currentTier: DensityTier): DensityTier | null` — returns the next tier to try, or `null` if the current tier already fits (no more stepping needed) or the tiers are exhausted. Consumed by Task 9 (`useAutoDensity`).

- [ ] **Step 1: Write the failing test**

Create `src/lib/densityTier.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { chooseDensityTier, DENSITY_TIERS } from './densityTier'

describe('chooseDensityTier', () => {
  it('returns null when content already fits at the current tier', () => {
    expect(chooseDensityTier(1000, 1920, 'comfortable')).toBeNull()
  })

  it('steps to the next denser tier when content overflows', () => {
    expect(chooseDensityTier(2200, 1920, 'comfortable')).toBe('compact')
    expect(chooseDensityTier(2200, 1920, 'compact')).toBe('dense')
  })

  it('returns null when already at the densest tier, even if still overflowing', () => {
    expect(chooseDensityTier(5000, 1920, 'dense')).toBeNull()
  })

  it('exposes the ordered tier list', () => {
    expect(DENSITY_TIERS).toEqual(['comfortable', 'compact', 'dense'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/densityTier.test.ts`
Expected: FAIL — `Cannot find module './densityTier'`

- [ ] **Step 3: Implement `chooseDensityTier`**

Create `src/lib/densityTier.ts`:

```ts
export const DENSITY_TIERS = ['comfortable', 'compact', 'dense'] as const
export type DensityTier = (typeof DENSITY_TIERS)[number]

export function chooseDensityTier(
  contentHeight: number,
  viewportHeight: number,
  currentTier: DensityTier
): DensityTier | null {
  if (contentHeight <= viewportHeight) return null

  const currentIndex = DENSITY_TIERS.indexOf(currentTier)
  const nextTier = DENSITY_TIERS[currentIndex + 1]
  return nextTier ?? null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/densityTier.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/densityTier.ts src/lib/densityTier.test.ts
git commit -m "Add chooseDensityTier pure function"
```

---

### Task 9: `useAutoDensity` hook

**Files:**
- Create: `src/hooks/useAutoDensity.ts`
- Test: `src/hooks/useAutoDensity.test.ts`

**Interfaces:**
- Consumes: `chooseDensityTier`, `DensityTier`, `DENSITY_TIERS` from `@/lib/densityTier` (Task 8).
- Produces: `useAutoDensity(containerRef: RefObject<HTMLElement>, viewportHeight: number): DensityTier` — measures `containerRef.current.scrollHeight` after each render, steps the tier via `chooseDensityTier`, re-measures on the next render until it stabilizes. Consumed by Task 10 (Board).

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useAutoDensity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useAutoDensity } from './useAutoDensity'

function renderWithHeight(scrollHeight: number, viewportHeight: number) {
  return renderHook(() => {
    const ref = useRef<HTMLDivElement>(null)
    if (!ref.current) {
      // Simulate a mounted element by attaching a fake node with the given scrollHeight.
      const el = document.createElement('div')
      Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
      ;(ref as { current: HTMLDivElement }).current = el
    }
    return useAutoDensity(ref, viewportHeight)
  })
}

describe('useAutoDensity', () => {
  it('stays at comfortable when content fits', () => {
    const { result } = renderWithHeight(1000, 1920)
    expect(result.current).toBe('comfortable')
  })

  it('steps down to compact when content overflows comfortable', () => {
    const { result, rerender } = renderWithHeight(2200, 1920)
    rerender()
    expect(result.current).toBe('compact')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/useAutoDensity.test.ts`
Expected: FAIL — `Cannot find module './useAutoDensity'`

- [ ] **Step 3: Implement `useAutoDensity`**

Create `src/hooks/useAutoDensity.ts`:

```ts
'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'
import { chooseDensityTier, type DensityTier } from '@/lib/densityTier'

export function useAutoDensity(
  containerRef: RefObject<HTMLElement>,
  viewportHeight: number
): DensityTier {
  const [tier, setTier] = useState<DensityTier>('comfortable')

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const next = chooseDensityTier(el.scrollHeight, viewportHeight, tier)
    if (next) setTier(next)
  })

  return tier
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/useAutoDensity.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAutoDensity.ts src/hooks/useAutoDensity.test.ts
git commit -m "Add useAutoDensity hook for Board overflow handling"
```

---

### Task 10: Board page (`/board`)

**Files:**
- Create: `src/app/board/page.tsx`
- Test: `src/app/board/page.test.tsx`

**Interfaces:**
- Consumes: `DashboardHeader` (Task 6), `StatBar` (Task 4), `ProblemsBanner` (Task 7), `TankGauge` (Task 5), `useAutoDensity` (Task 9), `useRealtimeRefetch`, `getSupabaseClient` (existing), `Tank`/`EquipmentItem`/`LogEntry` types, `CATEGORY_LABELS` from `@/lib/equipmentLabels`.
- Produces: a fixed 1080×1920, no-scroll, view-only page at `/board`.

- [ ] **Step 1: Write the failing test**

Create `src/app/board/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BoardPage from './page'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: () => {},
  }),
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => [],
    })
  )
})

describe('BoardPage', () => {
  it('renders the header and stat bar with no interactive controls', async () => {
    render(<BoardPage />)
    expect(await screen.findByRole('heading', { name: /hazmat inventory/i })).toBeInTheDocument()
    expect(screen.getByTestId('stat-bar')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/board/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Implement the Board page**

Create `src/app/board/page.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { StatBar } from '@/components/ui/StatBar'
import { ProblemsBanner } from '@/components/ProblemsBanner'
import { TankGauge } from '@/components/TankGauge'
import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES } from '@/lib/types'
import { useAutoDensity } from '@/hooks/useAutoDensity'
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { EquipmentItem, LogEntry, Tank } from '@/lib/types'

const DENSITY_PADDING: Record<'comfortable' | 'compact' | 'dense', string> = {
  comfortable: 'p-3 text-base',
  compact: 'p-2 text-sm',
  dense: 'p-1.5 text-xs',
}

export default function BoardPage() {
  const [tanks, setTanks] = useState<Tank[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const tier = useAutoDensity(containerRef, 1920)

  const refetchTanks = useCallback(async () => {
    const response = await fetch('/api/tanks')
    setTanks(await response.json())
  }, [])

  const refetchEquipment = useCallback(async () => {
    const response = await fetch('/api/equipment')
    setEquipment(await response.json())
  }, [])

  const refetchLogs = useCallback(async () => {
    const response = await fetch('/api/logs')
    setLogEntries(await response.json())
  }, [])

  useEffect(() => {
    refetchTanks()
    refetchEquipment()
    refetchLogs()
  }, [refetchTanks, refetchEquipment, refetchLogs])

  const client = getSupabaseClient()
  useRealtimeRefetch(client, 'tanks', refetchTanks)
  useRealtimeRefetch(client, 'equipment_items', refetchEquipment)
  useRealtimeRefetch(client, 'log_entries', refetchLogs)

  const latestProblem = logEntries.find((e) => e.entryType === 'problem_note' && !e.resolved) ?? null
  const activeTanks = tanks.filter((t) => t.status === 'in_use')
  const activeEquipment = equipment.filter((e) => e.status !== 'retired')

  return (
    <main className="mx-auto flex h-[1920px] w-[1080px] flex-col overflow-hidden bg-bg">
      <DashboardHeader subtitle="Engine 11 · Ladder 21 · RRT 5" />
      <div ref={containerRef} className={`flex-1 space-y-3 ${DENSITY_PADDING[tier]}`}>
        <StatBar tanks={tanks} equipment={equipment} logEntries={logEntries} />
        <ProblemsBanner latestProblem={latestProblem} />
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wide text-gold">Cylinders</h2>
          <div className="grid grid-cols-2 gap-2">
            {activeTanks.map((tank) => (
              <TankGauge key={tank.id} tank={tank} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wide text-gold">Equipment</h2>
          {EQUIPMENT_CATEGORIES.map((category) => {
            const items = activeEquipment.filter((i) => i.category === category)
            if (items.length === 0) return null
            return (
              <div key={category} className="mb-2">
                <h3 className="text-[11px] font-semibold text-ink-dim">
                  {CATEGORY_LABELS[category]}
                </h3>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-gold/20 bg-panel px-2 py-1"
                  >
                    <span>{item.name}</span>
                    <span
                      className={
                        item.status === 'in_service' ? 'text-status-green' : 'text-status-red'
                      }
                    >
                      {item.status === 'in_service' ? 'In Service' : 'Out of Service'}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/board/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/board/page.tsx src/app/board/page.test.tsx
git commit -m "Add fixed 1080x1920 view-only Board page"
```

---

### Task 11: Restyle Command Center shell (`page.tsx`)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `DashboardHeader` (Task 6), `StatBar` (Task 4) — new additions to the existing page; `TankSection`, `EquipmentSection`, `ProblemsBanner`, `useLocalName`, `useRealtimeRefetch`, `getSupabaseClient` (unchanged imports).
- Produces: same page component shape, now using the shared header (title text changes from "HAZMAT Inventory Dashboard" to "HAZMAT Inventory" per `DashboardHeader`), plus the stat bar and links to `/log` and `/labels`.

- [ ] **Step 1: Update the test for the new header text and added links**

Replace `src/app/page.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from './page'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: () => {},
  }),
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => [],
    })
  )
})

describe('DashboardPage', () => {
  it('renders the header, stat bar, and the cylinders section', async () => {
    render(<DashboardPage />)
    expect(await screen.findByRole('heading', { name: /hazmat inventory/i })).toBeInTheDocument()
    expect(screen.getByTestId('stat-bar')).toBeInTheDocument()
    expect(screen.getByText('Cylinders')).toBeInTheDocument()
  })

  it('links to the activity log and QR labels pages', async () => {
    render(<DashboardPage />)
    await screen.findByTestId('stat-bar')
    expect(screen.getByText('View full activity log →')).toHaveAttribute('href', '/log')
    expect(screen.getByText('Print QR labels →')).toHaveAttribute('href', '/labels')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/page.test.tsx`
Expected: FAIL — old heading text doesn't match `/hazmat inventory/i` as a full replace, and `/labels` link doesn't exist yet. (Note: `/hazmat inventory/i` actually still matches "HAZMAT Inventory Dashboard" today — the failure will be on the missing `stat-bar` testid and missing `/labels` link.)

- [ ] **Step 3: Rewrite `page.tsx`**

Replace `src/app/page.tsx` with:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { StatBar } from '@/components/ui/StatBar'
import { TankSection } from '@/components/TankSection'
import { EquipmentSection } from '@/components/EquipmentSection'
import { ProblemsBanner } from '@/components/ProblemsBanner'
import { useLocalName } from '@/hooks/useLocalName'
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { EquipmentItem, LogEntry, Tank } from '@/lib/types'

export default function DashboardPage() {
  const [tanks, setTanks] = useState<Tank[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [name, setName] = useLocalName()

  const refetchTanks = useCallback(async () => {
    const response = await fetch('/api/tanks')
    setTanks(await response.json())
  }, [])

  const refetchEquipment = useCallback(async () => {
    const response = await fetch('/api/equipment')
    setEquipment(await response.json())
  }, [])

  const refetchLogs = useCallback(async () => {
    const response = await fetch('/api/logs')
    setLogEntries(await response.json())
  }, [])

  useEffect(() => {
    refetchTanks()
    refetchEquipment()
    refetchLogs()
  }, [refetchTanks, refetchEquipment, refetchLogs])

  const client = getSupabaseClient()
  useRealtimeRefetch(client, 'tanks', refetchTanks)
  useRealtimeRefetch(client, 'equipment_items', refetchEquipment)
  useRealtimeRefetch(client, 'log_entries', refetchLogs)

  const latestProblem = logEntries.find((e) => e.entryType === 'problem_note' && !e.resolved) ?? null

  return (
    <div className="min-h-screen">
      <DashboardHeader subtitle="Engine 11 · Ladder 21 · RRT 5" />
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <label className="block text-sm text-ink-dim">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-gold/20 bg-panel px-2 py-1 text-ink"
          />
        </label>
        <StatBar tanks={tanks} equipment={equipment} logEntries={logEntries} />
        <ProblemsBanner latestProblem={latestProblem} />
        <div className="grid gap-6 md:grid-cols-2">
          <TankSection tanks={tanks} updatedBy={name} onChanged={refetchTanks} />
          <EquipmentSection items={equipment} updatedBy={name} onChanged={refetchEquipment} />
        </div>
        <div className="flex gap-4 text-sm">
          <a href="/log" className="text-gold underline">
            View full activity log →
          </a>
          <a href="/labels" className="text-gold underline">
            Print QR labels →
          </a>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "Restyle Command Center shell with header, stat bar, and labels link"
```

---

### Task 12: Restyle `TankSection` and `TankControls`

**Files:**
- Modify: `src/components/TankSection.tsx`
- Modify: `src/components/TankControls.tsx`
- Test: `src/components/TankControls.test.tsx` (existing — must keep passing unchanged)

**Interfaces:**
- No prop/behavior changes to either component — visual only. `TankControls.test.tsx` asserts on `fetch` calls and label text, not classes, so it requires no edits.

- [ ] **Step 1: Confirm `TankControls.test.tsx` has no class assertions (already read — confirmed it only checks fetch payloads and disabled state)**

No action needed; proceed.

- [ ] **Step 2: Restyle `TankSection`**

Replace `src/components/TankSection.tsx` with:

```tsx
import { TankGauge } from './TankGauge'
import { TankControls } from './TankControls'
import { AddTankForm } from './AddTankForm'
import type { Tank } from '@/lib/types'

export function TankSection({
  tanks,
  updatedBy,
  onChanged,
}: {
  tanks: Tank[]
  updatedBy: string
  onChanged: () => void
}) {
  const inUse = tanks.filter((t) => t.status === 'in_use')
  const spares = tanks.filter((t) => t.status === 'spare')

  return (
    <section className="rounded-lg border border-gold/20 bg-panel2 p-4">
      <h2 className="mb-3 text-xs uppercase tracking-wide text-gold">Cylinders</h2>
      <div className="flex flex-wrap gap-3">
        {inUse.map((tank) => (
          <div key={tank.id}>
            <TankGauge tank={tank} />
            <TankControls tank={tank} updatedBy={updatedBy} onChanged={onChanged} />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-ink-dim">Spare tanks: {spares.length}</h3>
        <ul className="text-sm">
          {spares.map((tank) => (
            <li key={tank.id} className="mb-1 text-ink">
              {tank.gasType} — {tank.psi} psi
              <TankControls tank={tank} updatedBy={updatedBy} onChanged={onChanged} />
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <AddTankForm updatedBy={updatedBy} onAdded={onChanged} />
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Restyle `TankControls`**

Replace `src/components/TankControls.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import type { Tank, TankStatus } from '@/lib/types'

export function TankControls({
  tank,
  updatedBy,
  onChanged,
}: {
  tank: Tank
  updatedBy: string
  onChanged: () => void
}) {
  const [psi, setPsi] = useState(String(tank.psi))
  const [status, setStatus] = useState<TankStatus>(tank.status)
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setSubmitting(true)
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ psi: Number(psi), status, updatedBy }),
    })
    setSubmitting(false)
    onChanged()
  }

  async function handleRetire() {
    setSubmitting(true)
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'retired', updatedBy }),
    })
    setSubmitting(false)
    onChanged()
  }

  return (
    <div className="mt-1 flex items-end gap-2 text-ink">
      <label className="flex flex-col text-xs text-ink-dim">
        PSI
        <input
          type="number"
          value={psi}
          onChange={(e) => setPsi(e.target.value)}
          className="w-20 rounded border border-gold/20 bg-panel px-1 text-ink"
        />
      </label>
      <label className="flex flex-col text-xs text-ink-dim">
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TankStatus)}
          className="rounded border border-gold/20 bg-panel text-ink"
        >
          <option value="in_use">In use</option>
          <option value="spare">Spare</option>
        </select>
      </label>
      <button
        onClick={handleSave}
        disabled={submitting || !updatedBy}
        className="text-xs text-gold underline disabled:opacity-50"
      >
        Save
      </button>
      <button
        onClick={handleRetire}
        disabled={submitting || !updatedBy}
        className="text-xs text-status-red underline disabled:opacity-50"
      >
        Retire
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the existing `TankControls` test to confirm it still passes unchanged**

Run: `npx vitest run src/components/TankControls.test.tsx`
Expected: PASS (all 3 tests, no edits made to the test file)

- [ ] **Step 5: Commit**

```bash
git add src/components/TankSection.tsx src/components/TankControls.tsx
git commit -m "Restyle TankSection and TankControls to branded theme"
```

---

### Task 13: Restyle `EquipmentSection`

**Files:**
- Modify: `src/components/EquipmentSection.tsx`
- Modify: `src/components/EquipmentSection.test.tsx`

**Interfaces:**
- No prop/behavior changes — visual only, except the status-color class names change from Tailwind defaults (`text-green-600`/`text-red-600`) to the new tokens (`text-status-green`/`text-status-red`), which requires updating the two class assertions in the test.

- [ ] **Step 1: Update the class assertions in the test**

In `src/components/EquipmentSection.test.tsx`, change:

```tsx
    expect(screen.getByTestId('status-1')).toHaveClass('text-green-600')
    expect(screen.getByTestId('status-2')).toHaveClass('text-red-600')
```

to:

```tsx
    expect(screen.getByTestId('status-1')).toHaveClass('text-status-green')
    expect(screen.getByTestId('status-2')).toHaveClass('text-status-red')
```

- [ ] **Step 2: Run the test to verify it fails against the current implementation**

Run: `npx vitest run src/components/EquipmentSection.test.tsx`
Expected: FAIL on the "groups items by category" test (class mismatch)

- [ ] **Step 3: Restyle `EquipmentSection`**

Replace `src/components/EquipmentSection.tsx` with:

```tsx
'use client'

import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES } from '@/lib/types'
import type { EquipmentItem, EquipmentStatus } from '@/lib/types'
import { AddEquipmentForm } from './AddEquipmentForm'

async function toggleStatus(item: EquipmentItem, updatedBy: string) {
  const nextStatus: EquipmentStatus = item.status === 'in_service' ? 'out_of_service' : 'in_service'
  await fetch(`/api/equipment/${item.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: nextStatus, updatedBy }),
  })
}

async function retireItem(item: EquipmentItem, updatedBy: string) {
  await fetch(`/api/equipment/${item.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'retired', updatedBy }),
  })
}

export function EquipmentSection({
  items,
  updatedBy,
  onChanged,
}: {
  items: EquipmentItem[]
  updatedBy: string
  onChanged: () => void
}) {
  return (
    <section className="rounded-lg border border-gold/20 bg-panel2 p-4">
      <h2 className="mb-3 text-xs uppercase tracking-wide text-gold">Equipment</h2>
      {EQUIPMENT_CATEGORIES.map((category) => {
        const categoryItems = items.filter((i) => i.category === category && i.status !== 'retired')
        if (categoryItems.length === 0) return null
        return (
          <div key={category} className="mb-3">
            <h3 className="text-sm font-medium text-ink-dim">{CATEGORY_LABELS[category]}</h3>
            <ul>
              {categoryItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-ink">
                  <span
                    data-testid={`status-${item.id}`}
                    className={item.status === 'in_service' ? 'text-status-green' : 'text-status-red'}
                  >
                    ●
                  </span>
                  {item.name}
                  <button
                    disabled={!updatedBy}
                    onClick={async () => {
                      await toggleStatus(item, updatedBy)
                      onChanged()
                    }}
                    className="text-xs text-gold underline disabled:opacity-50"
                  >
                    Toggle
                  </button>
                  <button
                    disabled={!updatedBy}
                    onClick={async () => {
                      await retireItem(item, updatedBy)
                      onChanged()
                    }}
                    className="text-xs text-status-red underline disabled:opacity-50"
                  >
                    Retire
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <div className="mt-4">
        <AddEquipmentForm updatedBy={updatedBy} onAdded={onChanged} />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/EquipmentSection.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/EquipmentSection.tsx src/components/EquipmentSection.test.tsx
git commit -m "Restyle EquipmentSection to branded status tokens"
```

---

### Task 14: Restyle `AddTankForm` and `AddEquipmentForm`

**Files:**
- Modify: `src/components/AddTankForm.tsx`
- Modify: `src/components/AddEquipmentForm.tsx`

**Interfaces:**
- No prop/behavior changes — visual only. Neither file has a dedicated test today, so no test file changes.

- [ ] **Step 1: Restyle `AddTankForm`**

Replace `src/components/AddTankForm.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import type { NewTankInput, TankStatus } from '@/lib/types'

export function AddTankForm({
  updatedBy,
  onAdded,
}: {
  updatedBy: string
  onAdded: () => void
}) {
  const [gasType, setGasType] = useState('')
  const [assignedMeter, setAssignedMeter] = useState('')
  const [psi, setPsi] = useState('')
  const [maxPsi, setMaxPsi] = useState('')
  const [status, setStatus] = useState<TankStatus>('in_use')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    const input: NewTankInput = {
      gasType,
      assignedMeter: assignedMeter || null,
      psi: Number(psi),
      maxPsi: Number(maxPsi),
      status,
      createdBy: updatedBy,
    }
    await fetch('/api/tanks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    setSubmitting(false)
    setGasType('')
    setAssignedMeter('')
    setPsi('')
    setMaxPsi('')
    onAdded()
  }

  const inputClass = 'rounded border border-gold/20 bg-panel px-2 py-1 text-ink'

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 text-ink-dim">
      <label className="flex flex-col text-sm">
        Gas type
        <input
          value={gasType}
          onChange={(e) => setGasType(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col text-sm">
        Assigned meter
        <input
          value={assignedMeter}
          onChange={(e) => setAssignedMeter(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col text-sm">
        PSI
        <input
          type="number"
          value={psi}
          onChange={(e) => setPsi(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col text-sm">
        Max PSI
        <input
          type="number"
          value={maxPsi}
          onChange={(e) => setMaxPsi(e.target.value)}
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col text-sm">
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TankStatus)}
          className={inputClass}
        >
          <option value="in_use">In use</option>
          <option value="spare">Spare</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting || !updatedBy}
        className="rounded bg-gold px-3 py-1 text-bg disabled:opacity-50"
      >
        Add tank
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Restyle `AddEquipmentForm`**

Replace `src/components/AddEquipmentForm.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES } from '@/lib/types'
import type { EquipmentCategory, NewEquipmentInput } from '@/lib/types'

export function AddEquipmentForm({
  updatedBy,
  onAdded,
}: {
  updatedBy: string
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<EquipmentCategory>('meter_detector')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    const input: NewEquipmentInput = {
      name,
      category,
      status: 'in_service',
      createdBy: updatedBy,
    }
    await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    setSubmitting(false)
    setName('')
    onAdded()
  }

  const inputClass = 'rounded border border-gold/20 bg-panel px-2 py-1 text-ink'

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 text-ink-dim">
      <label className="flex flex-col text-sm">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
      </label>
      <label className="flex flex-col text-sm">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
          className={inputClass}
        >
          {EQUIPMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting || !updatedBy}
        className="rounded bg-gold px-3 py-1 text-bg disabled:opacity-50"
      >
        Add equipment
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS (all tests, including `EquipmentSection.test.tsx` which renders `AddEquipmentForm` and asserts on the "Name" label and "Add equipment" text — unchanged here)

- [ ] **Step 4: Commit**

```bash
git add src/components/AddTankForm.tsx src/components/AddEquipmentForm.tsx
git commit -m "Restyle AddTankForm and AddEquipmentForm inputs to branded theme"
```

---

### Task 15: Restyle Log page, `LogTable`, and `NewProblemForm`

**Files:**
- Modify: `src/app/log/page.tsx`
- Modify: `src/components/LogTable.tsx`
- Modify: `src/components/NewProblemForm.tsx`
- Test: `src/app/log/page.test.tsx`, `src/components/LogTable.test.tsx`, `src/components/NewProblemForm.test.tsx` (existing — must keep passing unchanged; none assert on classes)

**Interfaces:**
- No prop/behavior changes to any of the three components — visual only.

- [ ] **Step 1: Restyle `LogTable`**

Replace `src/components/LogTable.tsx` with:

```tsx
'use client'

import type { LogEntry } from '@/lib/types'

export function LogTable({
  entries,
  onResolve,
}: {
  entries: LogEntry[]
  onResolve: (id: string) => void
}) {
  return (
    <table className="w-full text-sm text-ink">
      <thead>
        <tr className="border-b border-gold/20 text-left text-ink-dim">
          <th className="py-1">When</th>
          <th className="py-1">Who</th>
          <th className="py-1">Type</th>
          <th className="py-1">Description</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-b border-gold/10">
            <td className="py-1">{new Date(entry.createdAt).toLocaleString()}</td>
            <td className="py-1">{entry.createdBy}</td>
            <td className="py-1">{entry.entryType}</td>
            <td className="py-1">
              {entry.description}
              {entry.entryType === 'problem_note' && entry.resolved && (
                <span className="ml-2 text-xs text-status-green">(resolved)</span>
              )}
            </td>
            <td className="py-1">
              {entry.entryType === 'problem_note' && !entry.resolved && (
                <button onClick={() => onResolve(entry.id)} className="text-xs text-gold underline">
                  Mark resolved
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Restyle `NewProblemForm`**

Replace `src/components/NewProblemForm.tsx` with:

```tsx
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
```

- [ ] **Step 3: Restyle the Log page shell**

Replace `src/app/log/page.tsx` with:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { LogTable } from '@/components/LogTable'
import { NewProblemForm } from '@/components/NewProblemForm'
import { useLocalName } from '@/hooks/useLocalName'
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { LogEntry } from '@/lib/types'

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [name, setName] = useLocalName()
  const [resolveError, setResolveError] = useState('')

  const refetch = useCallback(async () => {
    const response = await fetch('/api/logs')
    setEntries(await response.json())
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeRefetch(getSupabaseClient(), 'log_entries', refetch)

  async function handleResolve(id: string) {
    setResolveError('')
    const response = await fetch(`/api/logs/${id}`, { method: 'PATCH' })
    if (!response.ok) {
      setResolveError('Failed to save — please try again.')
      return
    }
    refetch()
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader subtitle="Engine 11 · Ladder 21 · RRT 5" />
      <main className="mx-auto max-w-3xl p-6">
        <a href="/" className="text-sm text-gold underline">
          ← Back to dashboard
        </a>
        <h2 className="mb-4 mt-2 text-xl font-bold text-ink">Activity Log</h2>
        <label className="mb-4 block text-sm text-ink-dim">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-gold/20 bg-panel px-2 py-1 text-ink"
          />
        </label>
        <div className="mb-6">
          <NewProblemForm updatedBy={name} onAdded={refetch} />
        </div>
        {resolveError && <p className="mb-4 text-sm text-status-red">{resolveError}</p>}
        <LogTable entries={entries} onResolve={handleResolve} />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS. `src/app/log/page.test.tsx` checks the "Activity Log" heading by regex `/activity log/i` — still present as an `<h2>`, so it passes; the "Mark resolved" fetch-call-count test is unaffected by styling.

- [ ] **Step 5: Commit**

```bash
git add src/app/log/page.tsx src/components/LogTable.tsx src/components/NewProblemForm.tsx
git commit -m "Restyle Activity Log page, LogTable, and NewProblemForm to branded theme"
```

---

### Task 16: `scanUrl` pure functions

**Files:**
- Create: `src/lib/scanUrl.ts`
- Test: `src/lib/scanUrl.test.ts`

**Interfaces:**
- Produces: `tankScanPath(id: string): string`, `equipmentScanPath(id: string): string`, `problemScanPath(): string` (all return relative paths like `/scan/tank/<id>`), and `toAbsoluteUrl(path: string, origin: string): string`. Consumed by Task 17 (`QrCode` usage sites) and Task 22 (labels page).

- [ ] **Step 1: Write the failing test**

Create `src/lib/scanUrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tankScanPath, equipmentScanPath, problemScanPath, toAbsoluteUrl } from './scanUrl'

describe('scanUrl', () => {
  it('builds a tank scan path from an id', () => {
    expect(tankScanPath('abc-123')).toBe('/scan/tank/abc-123')
  })

  it('builds an equipment scan path from an id', () => {
    expect(equipmentScanPath('xyz-789')).toBe('/scan/equipment/xyz-789')
  })

  it('returns the fixed generic problem scan path', () => {
    expect(problemScanPath()).toBe('/scan/problem')
  })

  it('joins an origin and a path into an absolute URL', () => {
    expect(toAbsoluteUrl('/scan/tank/abc-123', 'https://hazmat-tracker.vercel.app')).toBe(
      'https://hazmat-tracker.vercel.app/scan/tank/abc-123'
    )
  })

  it('strips a trailing slash from the origin before joining', () => {
    expect(toAbsoluteUrl('/scan/problem', 'https://hazmat-tracker.vercel.app/')).toBe(
      'https://hazmat-tracker.vercel.app/scan/problem'
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/scanUrl.test.ts`
Expected: FAIL — `Cannot find module './scanUrl'`

- [ ] **Step 3: Implement `scanUrl`**

Create `src/lib/scanUrl.ts`:

```ts
export function tankScanPath(id: string): string {
  return `/scan/tank/${id}`
}

export function equipmentScanPath(id: string): string {
  return `/scan/equipment/${id}`
}

export function problemScanPath(): string {
  return '/scan/problem'
}

export function toAbsoluteUrl(path: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}${path}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/scanUrl.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/scanUrl.ts src/lib/scanUrl.test.ts
git commit -m "Add scanUrl pure functions for QR path/URL construction"
```

---

### Task 17: `QrCode` component

**Files:**
- Modify: `package.json` (add `qrcode` + `@types/qrcode`)
- Create: `src/components/QrCode.tsx`
- Test: `src/components/QrCode.test.tsx`

**Interfaces:**
- Consumes: `qrcode` npm package's `QRCode.toDataURL(value: string): Promise<string>`.
- Produces: `<QrCode value={string} size?: number />`, rendering an `<img>` once the data URL resolves. Consumed by Task 22 (labels page).

- [ ] **Step 1: Add the `qrcode` dependency**

Run: `npm install qrcode` and `npm install -D @types/qrcode`

- [ ] **Step 2: Write the failing test**

Create `src/components/QrCode.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QrCode } from './QrCode'

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake'),
  },
}))

describe('QrCode', () => {
  it('renders an image with the generated data URL once ready', async () => {
    render(<QrCode value="https://hazmat-tracker.vercel.app/scan/tank/abc" />)
    const img = await waitFor(() => screen.getByRole('img'))
    expect(img).toHaveAttribute('src', 'data:image/png;base64,fake')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/QrCode.test.tsx`
Expected: FAIL — `Cannot find module './QrCode'`

- [ ] **Step 4: Implement `QrCode`**

Create `src/components/QrCode.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!dataUrl) return <div style={{ width: size, height: size }} className="bg-panel" />

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt={`QR code for ${value}`} width={size} height={size} />
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/QrCode.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/QrCode.tsx src/components/QrCode.test.tsx
git commit -m "Add QrCode component backed by the qrcode package"
```

---

### Task 18: GET endpoints for single tank/equipment lookup

**Files:**
- Modify: `src/app/api/tanks/[id]/route.ts`
- Modify: `src/app/api/equipment/[id]/route.ts`
- Test: `src/app/api/tanks/[id]/route.test.ts`, `src/app/api/equipment/[id]/route.test.ts`

**Interfaces:**
- Consumes: `getRepository` from `@/lib/repositoryFactory`, `repo.getTank(id)`/`repo.getEquipmentItem(id)` (already exist on `Repository`).
- Produces: `GET /api/tanks/[id]` → `Tank` JSON or 404; `GET /api/equipment/[id]` → `EquipmentItem` JSON or 404. Consumed by Task 19 and Task 20 (scan pages).

- [ ] **Step 1: Add the failing GET test for tanks**

In `src/app/api/tanks/[id]/route.test.ts`, add (alongside the existing PATCH test, same file):

```ts
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { addTank } from '@/lib/services/tankService'

describe('/api/tanks/[id]', () => {
  it('PATCH updates psi and logs the change', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const tank = await addTank(repo, {
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      createdBy: 'J. Smith',
    })

    const request = new NextRequest(`http://localhost/api/tanks/${tank.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ psi: 1800, updatedBy: 'A. Lee' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await PATCH(request, { params: { id: tank.id } })
    const updated = await response.json()
    expect(updated.psi).toBe(1800)

    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toContain('PSI updated from 2200 to 1800')
  })

  it('GET returns the tank when it exists', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const tank = await addTank(repo, {
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      createdBy: 'J. Smith',
    })

    const response = await GET(new NextRequest(`http://localhost/api/tanks/${tank.id}`), {
      params: { id: tank.id },
    })
    expect(response.status).toBe(200)
    const found = await response.json()
    expect(found.id).toBe(tank.id)
  })

  it('GET returns 404 when the tank does not exist', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)

    const response = await GET(new NextRequest('http://localhost/api/tanks/nonexistent'), {
      params: { id: 'nonexistent' },
    })
    expect(response.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run the test to verify the two new GET tests fail**

Run: `npx vitest run src/app/api/tanks/[id]/route.test.ts`
Expected: FAIL — `GET is not exported from './route'`

- [ ] **Step 3: Add the GET handler to the tanks route**

In `src/app/api/tanks/[id]/route.ts`, add alongside the existing `PATCH`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { applyTankUpdate } from '@/lib/services/tankService'
import type { TankStatus } from '@/lib/types'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const repo = getRepository()
  const tank = await repo.getTank(params.id)
  if (!tank) {
    return NextResponse.json({ error: 'Tank not found' }, { status: 404 })
  }
  return NextResponse.json(tank)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { psi?: number; status?: TankStatus; updatedBy: string }
  const repo = getRepository()
  const tank = await applyTankUpdate(
    repo,
    params.id,
    { psi: body.psi, status: body.status },
    body.updatedBy
  )
  return NextResponse.json(tank)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/api/tanks/[id]/route.test.ts`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Repeat for equipment — add the failing GET test**

Read the existing `src/app/api/equipment/[id]/route.test.ts` first to preserve its current PATCH test, then add `GET` and `PATCH` to its import line and append:

```ts
  it('GET returns the equipment item when it exists', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const item = await repo.insertEquipmentItem({
      name: 'SCBA Pack #3',
      category: 'meter_detector',
      status: 'in_service',
      createdBy: 'J. Smith',
    })

    const response = await GET(new NextRequest(`http://localhost/api/equipment/${item.id}`), {
      params: { id: item.id },
    })
    expect(response.status).toBe(200)
    const found = await response.json()
    expect(found.id).toBe(item.id)
  })

  it('GET returns 404 when the equipment item does not exist', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)

    const response = await GET(new NextRequest('http://localhost/api/equipment/nonexistent'), {
      params: { id: 'nonexistent' },
    })
    expect(response.status).toBe(404)
  })
```

- [ ] **Step 6: Run the test to verify the new tests fail**

Run: `npx vitest run "src/app/api/equipment/[id]/route.test.ts"`
Expected: FAIL — `GET is not exported from './route'`

- [ ] **Step 7: Add the GET handler to the equipment route**

In `src/app/api/equipment/[id]/route.ts`, add alongside the existing `PATCH`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { applyEquipmentStatusChange } from '@/lib/services/equipmentService'
import type { EquipmentStatus } from '@/lib/types'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const repo = getRepository()
  const item = await repo.getEquipmentItem(params.id)
  if (!item) {
    return NextResponse.json({ error: 'Equipment item not found' }, { status: 404 })
  }
  return NextResponse.json(item)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { status: EquipmentStatus; updatedBy: string }
  const repo = getRepository()
  const item = await applyEquipmentStatusChange(repo, params.id, body.status, body.updatedBy)
  return NextResponse.json(item)
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run "src/app/api/equipment/[id]/route.test.ts"`
Expected: PASS (all tests)

- [ ] **Step 9: Commit**

```bash
git add src/app/api/tanks/[id]/route.ts src/app/api/tanks/[id]/route.test.ts src/app/api/equipment/[id]/route.ts "src/app/api/equipment/[id]/route.test.ts"
git commit -m "Add GET handlers for single tank/equipment lookup"
```

---

### Task 19: Scan quick-action page for tanks (`/scan/tank/[id]`)

**Files:**
- Create: `src/app/scan/tank/[id]/page.tsx`
- Test: `src/app/scan/tank/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/tanks/[id]` and `PATCH /api/tanks/[id]` (Task 18), `useLocalName` (existing), `DashboardHeader` (Task 6).
- Produces: a focused page at `/scan/tank/[id]` with a pre-filled PSI stepper form, a "Log a problem with this tank" action, and a "Retire" action; shows a "no longer active" state for a retired or missing tank.

- [ ] **Step 1: Write the failing test**

Create `src/app/scan/tank/[id]/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanTankPage from './page'
import type { Tank } from '@/lib/types'

const tank: Tank = {
  id: 'tank-1',
  gasType: 'Oxygen',
  assignedMeter: 'Meter 3',
  psi: 2000,
  maxPsi: 2200,
  status: 'in_use',
  lastUpdatedBy: 'A',
  lastUpdatedAt: new Date().toISOString(),
}

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('hazmat-dashboard-name', 'A. Lee')
})

describe('ScanTankPage', () => {
  it('shows the tank and pre-fills the PSI form with its current value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => tank }))
    render(<ScanTankPage params={{ id: 'tank-1' }} />)

    expect(await screen.findByText('Oxygen')).toBeInTheDocument()
    expect(screen.getByLabelText('PSI')).toHaveValue(2000)
  })

  it('PATCHes the new PSI on Update', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => tank })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...tank, psi: 1800 }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanTankPage params={{ id: 'tank-1' }} />)
    await screen.findByText('Oxygen')

    fireEvent.change(screen.getByLabelText('PSI'), { target: { value: '1800' } })
    fireEvent.click(screen.getByText('Update PSI'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/tanks/tank-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ psi: 1800, updatedBy: 'A. Lee' }),
        })
      )
    )
  })

  it('shows a "no longer active" state for a retired or missing tank', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    render(<ScanTankPage params={{ id: 'missing' }} />)
    expect(await screen.findByText(/no longer active/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/scan/tank/[id]/page.test.tsx"`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Implement the scan tank page**

Create `src/app/scan/tank/[id]/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { useLocalName } from '@/hooks/useLocalName'
import type { Tank, TankStatus } from '@/lib/types'

export default function ScanTankPage({ params }: { params: { id: string } }) {
  const [tank, setTank] = useState<Tank | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [psi, setPsi] = useState('')
  const [name] = useLocalName()
  const [problemText, setProblemText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/tanks/${params.id}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data: Tank = await response.json()
        if (cancelled) return
        if (data.status === 'retired') {
          setNotFound(true)
          return
        }
        setTank(data)
        setPsi(String(data.psi))
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  async function updatePsi() {
    if (!tank) return
    setSubmitting(true)
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ psi: Number(psi), updatedBy: name }),
    })
    setSubmitting(false)
  }

  async function retire() {
    if (!tank) return
    setSubmitting(true)
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'retired' as TankStatus, updatedBy: name }),
    })
    setSubmitting(false)
  }

  async function logProblem() {
    if (!tank || !problemText) return
    setSubmitting(true)
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        description: `${tank.gasType} (${tank.assignedMeter ?? 'unassigned'}): ${problemText}`,
        createdBy: name,
      }),
    })
    setSubmitting(false)
    setProblemText('')
  }

  if (notFound) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="p-6 text-ink">This item is no longer active.</main>
      </div>
    )
  }

  if (!tank) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="p-6 text-ink-dim">Loading…</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-sm space-y-6 p-6 text-ink">
        <div>
          <h2 className="text-lg font-bold">{tank.gasType}</h2>
          <p className="text-sm text-ink-dim">{tank.assignedMeter ?? 'Unassigned'}</p>
          <p className="font-mono text-3xl font-extrabold">{tank.psi} psi</p>
        </div>

        <div>
          <label htmlFor="psi-input" className="block text-sm text-ink-dim">
            PSI
          </label>
          <input
            id="psi-input"
            aria-label="PSI"
            type="number"
            value={psi}
            onChange={(e) => setPsi(e.target.value)}
            className="mt-1 w-full rounded border border-gold/20 bg-panel px-3 py-2 text-2xl text-ink"
          />
          <button
            onClick={updatePsi}
            disabled={submitting || !name}
            className="mt-2 w-full rounded bg-gold px-4 py-3 text-lg font-bold text-bg disabled:opacity-50"
          >
            Update PSI
          </button>
        </div>

        <div>
          <label htmlFor="problem-input" className="block text-sm text-ink-dim">
            Log a problem with this tank
          </label>
          <input
            id="problem-input"
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            className="mt-1 w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink"
          />
          <button
            onClick={logProblem}
            disabled={submitting || !name || !problemText}
            className="mt-2 w-full rounded bg-status-red px-4 py-2 text-ink disabled:opacity-50"
          >
            Log problem
          </button>
        </div>

        <button
          onClick={retire}
          disabled={submitting || !name}
          className="text-xs text-status-red underline disabled:opacity-50"
        >
          Retire this tank
        </button>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/scan/tank/[id]/page.test.tsx"`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/scan/tank/[id]/page.tsx" "src/app/scan/tank/[id]/page.test.tsx"
git commit -m "Add QR quick-action page for tanks"
```

---

### Task 20: Scan quick-action page for equipment (`/scan/equipment/[id]`)

**Files:**
- Create: `src/app/scan/equipment/[id]/page.tsx`
- Test: `src/app/scan/equipment/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/equipment/[id]` and `PATCH /api/equipment/[id]` (Task 18), `useLocalName`, `DashboardHeader` (Task 6).
- Produces: a focused page with a one-tap in/out-of-service toggle, "Log a problem with this item," and "Retire."

- [ ] **Step 1: Write the failing test**

Create `src/app/scan/equipment/[id]/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanEquipmentPage from './page'
import type { EquipmentItem } from '@/lib/types'

const item: EquipmentItem = {
  id: 'eq-1',
  name: 'Air Monitor — MultiRAE #2',
  category: 'meter_detector',
  status: 'in_service',
  lastUpdatedBy: 'A',
  lastUpdatedAt: new Date().toISOString(),
}

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('hazmat-dashboard-name', 'A. Lee')
})

describe('ScanEquipmentPage', () => {
  it('shows the item and a toggle labeled with the opposite status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => item }))
    render(<ScanEquipmentPage params={{ id: 'eq-1' }} />)

    expect(await screen.findByText('Air Monitor — MultiRAE #2')).toBeInTheDocument()
    expect(screen.getByText('Mark Out of Service')).toBeInTheDocument()
  })

  it('PATCHes the toggled status on tap', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => item })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...item, status: 'out_of_service' }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanEquipmentPage params={{ id: 'eq-1' }} />)
    await screen.findByText('Air Monitor — MultiRAE #2')

    fireEvent.click(screen.getByText('Mark Out of Service'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/equipment/eq-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'out_of_service', updatedBy: 'A. Lee' }),
        })
      )
    )
  })

  it('shows a "no longer active" state for a retired or missing item', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    render(<ScanEquipmentPage params={{ id: 'missing' }} />)
    expect(await screen.findByText(/no longer active/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/scan/equipment/[id]/page.test.tsx"`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Implement the scan equipment page**

Create `src/app/scan/equipment/[id]/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { useLocalName } from '@/hooks/useLocalName'
import type { EquipmentItem, EquipmentStatus } from '@/lib/types'

export default function ScanEquipmentPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<EquipmentItem | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [name] = useLocalName()
  const [problemText, setProblemText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/equipment/${params.id}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data: EquipmentItem = await response.json()
        if (cancelled) return
        if (data.status === 'retired') {
          setNotFound(true)
          return
        }
        setItem(data)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  async function toggleStatus() {
    if (!item) return
    const nextStatus: EquipmentStatus = item.status === 'in_service' ? 'out_of_service' : 'in_service'
    setSubmitting(true)
    await fetch(`/api/equipment/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, updatedBy: name }),
    })
    setSubmitting(false)
    setItem({ ...item, status: nextStatus })
  }

  async function retire() {
    if (!item) return
    setSubmitting(true)
    await fetch(`/api/equipment/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'retired', updatedBy: name }),
    })
    setSubmitting(false)
  }

  async function logProblem() {
    if (!item || !problemText) return
    setSubmitting(true)
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        description: `${item.name}: ${problemText}`,
        createdBy: name,
      }),
    })
    setSubmitting(false)
    setProblemText('')
  }

  if (notFound) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="p-6 text-ink">This item is no longer active.</main>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="p-6 text-ink-dim">Loading…</main>
      </div>
    )
  }

  const toggleLabel = item.status === 'in_service' ? 'Mark Out of Service' : 'Mark In Service'

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-sm space-y-6 p-6 text-ink">
        <div>
          <h2 className="text-lg font-bold">{item.name}</h2>
          <p className={item.status === 'in_service' ? 'text-status-green' : 'text-status-red'}>
            {item.status === 'in_service' ? 'In Service' : 'Out of Service'}
          </p>
        </div>

        <button
          onClick={toggleStatus}
          disabled={submitting || !name}
          className="w-full rounded bg-gold px-4 py-3 text-lg font-bold text-bg disabled:opacity-50"
        >
          {toggleLabel}
        </button>

        <div>
          <label htmlFor="problem-input" className="block text-sm text-ink-dim">
            Log a problem with this item
          </label>
          <input
            id="problem-input"
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            className="mt-1 w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink"
          />
          <button
            onClick={logProblem}
            disabled={submitting || !name || !problemText}
            className="mt-2 w-full rounded bg-status-red px-4 py-2 text-ink disabled:opacity-50"
          >
            Log problem
          </button>
        </div>

        <button
          onClick={retire}
          disabled={submitting || !name}
          className="text-xs text-status-red underline disabled:opacity-50"
        >
          Retire this item
        </button>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run "src/app/scan/equipment/[id]/page.test.tsx"`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/scan/equipment/[id]/page.tsx" "src/app/scan/equipment/[id]/page.test.tsx"
git commit -m "Add QR quick-action page for equipment"
```

---

### Task 21: Generic scan page (`/scan/problem`)

**Files:**
- Create: `src/app/scan/problem/page.tsx`
- Test: `src/app/scan/problem/page.test.tsx`

**Interfaces:**
- Consumes: `NewProblemForm` (Task 15), `useLocalName`, `DashboardHeader` (Task 6).
- Produces: a focused page reusing the existing `NewProblemForm`, not tied to any item.

- [ ] **Step 1: Write the failing test**

Create `src/app/scan/problem/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanProblemPage from './page'

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('hazmat-dashboard-name', 'A. Lee')
})

describe('ScanProblemPage', () => {
  it('submits a problem note using the remembered name', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanProblemPage />)

    fireEvent.change(screen.getByPlaceholderText('Describe the problem'), {
      target: { value: 'Deluge shower valve stuck' },
    })
    fireEvent.click(screen.getByText('Log problem'))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/logs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            description: 'Deluge shower valve stuck',
            createdBy: 'A. Lee',
          }),
        })
      )
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/scan/problem/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Implement the generic scan page**

Create `src/app/scan/problem/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/scan/problem/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/scan/problem/page.tsx src/app/scan/problem/page.test.tsx
git commit -m "Add generic QR quick-action page for logging a problem"
```

---

### Task 22: QR label printing page (`/labels`)

**Files:**
- Create: `src/app/labels/page.tsx`
- Test: `src/app/labels/page.test.tsx`
- Modify: `src/app/globals.css` (print stylesheet rules)

**Interfaces:**
- Consumes: `QrCode` (Task 17), `scanUrl` functions (Task 16), `DashboardHeader` (Task 6), existing `/api/tanks`, `/api/equipment` GET endpoints.
- Produces: a page listing every active tank and equipment item plus the fixed problem code, each with a QR label; a print-only layout via `@media print`.

- [ ] **Step 1: Write the failing test**

Create `src/app/labels/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LabelsPage from './page'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/tanks') {
        return Promise.resolve({
          json: async () => [
            {
              id: 'tank-1',
              gasType: 'Oxygen',
              assignedMeter: 'Meter 3',
              psi: 2000,
              maxPsi: 2200,
              status: 'in_use',
              lastUpdatedBy: 'A',
              lastUpdatedAt: new Date().toISOString(),
            },
          ],
        })
      }
      if (url === '/api/equipment') {
        return Promise.resolve({
          json: async () => [
            {
              id: 'eq-1',
              name: 'SCBA Pack #3',
              category: 'meter_detector',
              status: 'in_service',
              lastUpdatedBy: 'A',
              lastUpdatedAt: new Date().toISOString(),
            },
          ],
        })
      }
      return Promise.resolve({ json: async () => [] })
    })
  )
})

describe('LabelsPage', () => {
  it('lists a label for every active tank, equipment item, and the generic problem code', async () => {
    render(<LabelsPage />)
    expect(await screen.findByText('Oxygen')).toBeInTheDocument()
    expect(screen.getByText('SCBA Pack #3')).toBeInTheDocument()
    expect(screen.getByText('Log a Problem (general)')).toBeInTheDocument()
  })

  it('renders a Print All action', async () => {
    render(<LabelsPage />)
    await screen.findByText('Oxygen')
    expect(screen.getByText('Print All')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/labels/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Implement the labels page**

Create `src/app/labels/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { QrCode } from '@/components/QrCode'
import { equipmentScanPath, problemScanPath, tankScanPath, toAbsoluteUrl } from '@/lib/scanUrl'
import type { EquipmentItem, Tank } from '@/lib/types'

export default function LabelsPage() {
  const [tanks, setTanks] = useState<Tank[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    fetch('/api/tanks').then(async (r) => setTanks(await r.json()))
    fetch('/api/equipment').then(async (r) => setEquipment(await r.json()))
    setOrigin(window.location.origin)
  }, [])

  const activeTanks = tanks.filter((t) => t.status !== 'retired')
  const activeEquipment = equipment.filter((e) => e.status !== 'retired')

  return (
    <div className="min-h-screen print:bg-white">
      <div className="print:hidden">
        <DashboardHeader />
      </div>
      <main className="mx-auto max-w-4xl p-6 text-ink print:text-black">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold">QR Labels</h2>
          <button
            onClick={() => window.print()}
            className="rounded bg-gold px-3 py-1 text-bg"
          >
            Print All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 print:grid-cols-3">
          <div className="rounded border border-gold/20 bg-panel p-3 text-center print:border-black print:bg-white">
            <QrCode value={toAbsoluteUrl(problemScanPath(), origin)} />
            <p className="mt-2 text-sm">Log a Problem (general)</p>
          </div>
          {activeTanks.map((tank) => (
            <div
              key={tank.id}
              className="rounded border border-gold/20 bg-panel p-3 text-center print:border-black print:bg-white"
            >
              <QrCode value={toAbsoluteUrl(tankScanPath(tank.id), origin)} />
              <p className="mt-2 text-sm">{tank.gasType}</p>
              <p className="text-xs text-ink-dim">{tank.assignedMeter ?? 'Unassigned'}</p>
            </div>
          ))}
          {activeEquipment.map((item) => (
            <div
              key={item.id}
              className="rounded border border-gold/20 bg-panel p-3 text-center print:border-black print:bg-white"
            >
              <QrCode value={toAbsoluteUrl(equipmentScanPath(item.id), origin)} />
              <p className="mt-2 text-sm">{item.name}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/labels/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/labels/page.tsx src/app/labels/page.test.tsx
git commit -m "Add QR label printing page"
```

---

### Task 23: PWA manifest and install prompt scaffolding

**Files:**
- Create: `public/manifest.json`
- Create: `public/icon-192.png`, `public/icon-512.png` (generated from `public/gfd-badge.png`)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: a linked web app manifest so the scan pages can be added to a phone's home screen. No new testable logic (manifest correctness is verified by reading the JSON, not a unit test).

- [ ] **Step 1: Generate the two icon sizes from the badge**

Run (uses the `sharp` CLI bundled with Next.js's image pipeline is not guaranteed present; use a simple Node script instead):

```bash
node -e "
const sharp = require('sharp');
Promise.all([
  sharp('public/gfd-badge.png').resize(192, 192, { fit: 'contain', background: '#0a1120' }).toFile('public/icon-192.png'),
  sharp('public/gfd-badge.png').resize(512, 512, { fit: 'contain', background: '#0a1120' }).toFile('public/icon-512.png'),
]).then(() => console.log('icons written'));
"
```

If `sharp` is not installed, run `npm install -D sharp` first, then re-run the command above, then `npm uninstall sharp` (it's a one-time asset-generation tool, not a runtime dependency).

- [ ] **Step 2: Create the manifest**

Create `public/manifest.json`:

```json
{
  "name": "HAZMAT Inventory Dashboard",
  "short_name": "HAZMAT",
  "description": "Greensboro Fire Department HAZMAT Team inventory dashboard",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a1120",
  "theme_color": "#0a1120",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 3: Link the manifest from `layout.tsx`**

In `src/app/layout.tsx`, add a `manifest` field to the exported `metadata` object:

```ts
export const metadata = {
  title: 'HAZMAT Inventory Dashboard',
  themeColor: '#0a1120',
  manifest: '/manifest.json',
}
```

- [ ] **Step 4: Verify the manifest is valid JSON and the build succeeds**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/manifest.json', 'utf-8')); console.log('valid')"`
Expected: prints `valid`

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/icon-192.png public/icon-512.png src/app/layout.tsx
git commit -m "Add PWA manifest and home-screen icons"
```

---

### Task 24: Value-change highlight motion

**Files:**
- Create: `src/hooks/useValueHighlight.ts`
- Test: `src/hooks/useValueHighlight.test.ts`
- Modify: `src/components/TankGauge.tsx`
- Modify: `src/components/ui/StatTile.tsx`

**Interfaces:**
- Produces: `useValueHighlight<T>(value: T): boolean` — returns `true` for 600ms whenever `value` changes from its previous render, then `false`. Consumed by `TankGauge` and `StatTile` to flag a brief highlight when PSI or a stat count changes via realtime sync, per the spec's motion requirement.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useValueHighlight.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useValueHighlight } from './useValueHighlight'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useValueHighlight', () => {
  it('starts false on initial render', () => {
    const { result } = renderHook(({ value }) => useValueHighlight(value), {
      initialProps: { value: 100 },
    })
    expect(result.current).toBe(false)
  })

  it('becomes true when the value changes, then false again after 600ms', () => {
    const { result, rerender } = renderHook(({ value }) => useValueHighlight(value), {
      initialProps: { value: 100 },
    })

    rerender({ value: 200 })
    expect(result.current).toBe(true)

    vi.advanceTimersByTime(600)
    expect(result.current).toBe(false)
  })

  it('stays false when rerendered with the same value', () => {
    const { result, rerender } = renderHook(({ value }) => useValueHighlight(value), {
      initialProps: { value: 100 },
    })

    rerender({ value: 100 })
    expect(result.current).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/useValueHighlight.test.ts`
Expected: FAIL — `Cannot find module './useValueHighlight'`

- [ ] **Step 3: Implement `useValueHighlight`**

Create `src/hooks/useValueHighlight.ts`:

```ts
'use client'

import { useEffect, useRef, useState } from 'react'

export function useValueHighlight<T>(value: T): boolean {
  const previous = useRef(value)
  const [highlighted, setHighlighted] = useState(false)

  useEffect(() => {
    if (previous.current === value) return
    previous.current = value
    setHighlighted(true)
    const timeout = setTimeout(() => setHighlighted(false), 600)
    return () => clearTimeout(timeout)
  }, [value])

  return highlighted
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/useValueHighlight.test.ts`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Wire the highlight into `TankGauge`**

In `src/components/TankGauge.tsx`, add the hook and apply a transient ring plus a color transition on the PSI readout. Change the imports and the return statement:

```tsx
import { useValueHighlight } from '@/hooks/useValueHighlight'
import { gaugeColor, gaugeNeedleAngleDegrees, psiPercentage } from '@/lib/gauge'
import type { Tank } from '@/lib/types'

const ZONE_HEX: Record<'red' | 'yellow' | 'green', string> = {
  red: '#d21f3c',
  yellow: '#f2b705',
  green: '#34d399',
}

export function TankGauge({ tank }: { tank: Tank }) {
  const color = gaugeColor(tank.psi, tank.maxPsi)
  const angle = gaugeNeedleAngleDegrees(tank.psi, tank.maxPsi)
  const pct = psiPercentage(tank.psi, tank.maxPsi)
  const needleX = 60 + 45 * Math.sin((angle * Math.PI) / 180)
  const needleY = 60 - 45 * Math.cos((angle * Math.PI) / 180)
  const highlighted = useValueHighlight(tank.psi)

  return (
    <div
      data-testid="tank-gauge"
      data-color={color}
      className={`flex flex-col items-center rounded-lg border px-3 py-2 transition-colors duration-200 motion-reduce:transition-none ${
        highlighted ? 'border-gold-bright bg-panel2' : 'border-gold/20 bg-panel'
      }`}
    >
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path
          d="M10,60 A50,50 0 0 1 40,15"
          fill="none"
          stroke={ZONE_HEX.red}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M40,15 A50,50 0 0 1 80,15"
          fill="none"
          stroke={ZONE_HEX.yellow}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M80,15 A50,50 0 0 1 110,60"
          fill="none"
          stroke={ZONE_HEX.green}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <line
          x1="60"
          y1="60"
          x2={needleX}
          y2={needleY}
          stroke="#eef2f7"
          strokeWidth="3"
          className="transition-all duration-200 motion-reduce:transition-none"
        />
      </svg>
      <div className="text-sm font-semibold text-ink">{tank.gasType}</div>
      <div className="text-xs text-ink-dim">{tank.assignedMeter ?? 'Unassigned'}</div>
      <div
        className="font-mono text-lg font-extrabold transition-colors duration-200 motion-reduce:transition-none"
        style={{ color: ZONE_HEX[color] }}
      >
        {tank.psi} psi ({Math.round(pct)}%)
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run the existing `TankGauge` test to confirm it still passes unchanged**

Run: `npx vitest run src/components/TankGauge.test.tsx`
Expected: PASS (both tests — `data-testid`, `data-color`, and text assertions are untouched by the highlight class additions)

- [ ] **Step 7: Wire the highlight into `StatTile`**

Replace `src/components/ui/StatTile.tsx` with:

```tsx
'use client'

import { useValueHighlight } from '@/hooks/useValueHighlight'

export type StatTone = 'bad' | 'warn' | 'ok' | 'neutral'

const TONE_CLASSES: Record<StatTone, string> = {
  bad: 'text-status-red',
  warn: 'text-status-amber',
  ok: 'text-status-green',
  neutral: 'text-gold-bright',
}

export function StatTile({
  value,
  label,
  tone = 'neutral',
}: {
  value: number
  label: string
  tone?: StatTone
}) {
  const highlighted = useValueHighlight(value)

  return (
    <div
      className={`rounded-lg border px-3 py-2 transition-colors duration-200 motion-reduce:transition-none ${
        highlighted ? 'border-gold-bright bg-panel2' : 'border-gold/20 bg-panel'
      }`}
    >
      <div className={`font-mono text-2xl font-extrabold leading-none ${TONE_CLASSES[tone]}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-ink-dim">{label}</div>
    </div>
  )
}
```

- [ ] **Step 8: Run the `StatBar` test to confirm it still passes unchanged**

Run: `npx vitest run src/components/ui/StatBar.test.tsx`
Expected: PASS (renders `StatTile` internally; assertions are on text content, unaffected by the highlight class additions)

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useValueHighlight.ts src/hooks/useValueHighlight.test.ts src/components/TankGauge.tsx src/components/ui/StatTile.tsx
git commit -m "Add value-change highlight motion to TankGauge and StatTile"
```

---

## Final verification

After all 24 tasks are complete:

- [ ] Run `npm test` — full suite passes.
- [ ] Run `npm run build` — production build succeeds.
- [ ] Manual browser pass: `/board` at a 1080×1920 viewport shows no scrollbar and no interactive controls; `/` shows the stat bar and lets you edit a tank/equipment item; `/log` and `/labels` are reachable from `/`; a QR code from `/labels` scanned (or its encoded URL pasted directly) opens the correct `/scan/...` page and updates the item.
