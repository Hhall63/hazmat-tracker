# HAZMAT Inventory Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public web dashboard where a hazmat team can see live PSI gauges for in-use gas cylinders, spare tank counts, red/green in-service status for equipment, and current problem notes — plus a full history log — with no login required.

**Architecture:** A single Next.js 14 (App Router, TypeScript) app hosted free on Vercel. Data lives in a free-tier Supabase Postgres project; Supabase Realtime pushes live updates to every open browser tab (wall display + individual devices) with no polling. Business logic lives in a `Repository` interface with two implementations: `InMemoryRepository` (used in all automated tests, zero network) and `SupabaseRepository` (the real backend, used in production). No authentication — every write requires a free-text "name" field for attribution in the log.

**Tech Stack:** Next.js 14, React 18, TypeScript 5, Tailwind CSS 3, `@supabase/supabase-js` 2, Vitest 2 + @testing-library/react for tests, Supabase (Postgres + Realtime), Vercel (hosting).

## Global Constraints

- Single station, single cache of equipment — no multi-location support.
- No user accounts or login. The link is the access control. Every write action requires a `name` field, used only for attribution, not verified identity.
- Must be reachable from the public internet (not a local-network-only app) — hosted on Vercel + Supabase, both free tier.
- Retiring a tank or equipment item is always a soft-delete (`status: 'retired'`); never hard-delete rows, since log history references them.
- Tanks and equipment items are created and edited through the UI only — never hardcoded or seeded via migration.
- Every tank PSI/status change and every equipment status change automatically creates a `log_entries` row. Problem notes are entered directly as `log_entries` rows.

---

### Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Produces: a working Next.js + TypeScript + Tailwind + Vitest toolchain that every later task builds on.

- [ ] **Step 1: Write the config files**

`package.json`:
```json
{
  "name": "hazmat-inventory-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@supabase/supabase-js": "2.45.4"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/node": "20.14.15",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "tailwindcss": "3.4.7",
    "postcss": "8.4.41",
    "autoprefixer": "10.4.19",
    "vitest": "2.0.5",
    "@vitejs/plugin-react": "4.3.1",
    "jsdom": "24.1.1",
    "@testing-library/react": "16.0.0",
    "@testing-library/jest-dom": "6.4.8"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

`postcss.config.js`:
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

`.gitignore`:
```
node_modules
.next
.env.local
```

`.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `package-lock.json` and `node_modules/`.

- [ ] **Step 3: Write the app shell**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`:
```tsx
import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'HAZMAT Inventory Dashboard',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Write the failing smoke test**

`src/app/page.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

describe('Home page', () => {
  it('renders the dashboard heading', () => {
    render(<Page />)
    expect(
      screen.getByRole('heading', { name: /hazmat inventory dashboard/i })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/app/page.test.tsx`
Expected: FAIL — `Cannot find module './page'` (it doesn't exist yet).

- [ ] **Step 6: Write the placeholder page**

`src/app/page.tsx`:
```tsx
export default function Page() {
  return <h1>HAZMAT Inventory Dashboard</h1>
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/app/page.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 8: Confirm the build compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js vitest.config.ts vitest.setup.ts .gitignore .env.local.example src/app package-lock.json
git commit -m "Scaffold Next.js + TypeScript + Tailwind + Vitest project"
```

---

### Task 2: Shared types + Supabase schema migration

**Files:**
- Create: `src/lib/types.ts`
- Create: `supabase/migrations/0001_init.sql`
- Test: `src/lib/types.test.ts`

**Interfaces:**
- Produces: `TankStatus`, `EquipmentCategory`, `EquipmentStatus`, `LogEntryType` (and their `_STATUSES`/`_CATEGORIES`/`_TYPES` const arrays), `Tank`, `NewTankInput`, `EquipmentItem`, `NewEquipmentInput`, `LogEntry`, `NewLogEntryInput` — used by every later task.

- [ ] **Step 1: Write the failing test**

`src/lib/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  TANK_STATUSES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  LOG_ENTRY_TYPES,
} from './types'

describe('shared enums', () => {
  it('defines the three tank statuses', () => {
    expect(TANK_STATUSES).toEqual(['in_use', 'spare', 'retired'])
  })

  it('defines the three equipment categories', () => {
    expect(EQUIPMENT_CATEGORIES).toEqual(['meter_detector', 'ppe', 'tools_misc'])
  })

  it('defines the three equipment statuses', () => {
    expect(EQUIPMENT_STATUSES).toEqual(['in_service', 'out_of_service', 'retired'])
  })

  it('defines the three log entry types', () => {
    expect(LOG_ENTRY_TYPES).toEqual(['tank_update', 'equipment_status_change', 'problem_note'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/types.test.ts`
Expected: FAIL — `Cannot find module './types'`.

- [ ] **Step 3: Write the types**

`src/lib/types.ts`:
```ts
export const TANK_STATUSES = ['in_use', 'spare', 'retired'] as const
export type TankStatus = (typeof TANK_STATUSES)[number]

export const EQUIPMENT_CATEGORIES = ['meter_detector', 'ppe', 'tools_misc'] as const
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]

export const EQUIPMENT_STATUSES = ['in_service', 'out_of_service', 'retired'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

export const LOG_ENTRY_TYPES = ['tank_update', 'equipment_status_change', 'problem_note'] as const
export type LogEntryType = (typeof LOG_ENTRY_TYPES)[number]

export interface Tank {
  id: string
  gasType: string
  assignedMeter: string | null
  psi: number
  maxPsi: number
  status: TankStatus
  lastUpdatedBy: string
  lastUpdatedAt: string
}

export interface NewTankInput {
  gasType: string
  assignedMeter: string | null
  psi: number
  maxPsi: number
  status: TankStatus
  createdBy: string
}

export interface EquipmentItem {
  id: string
  name: string
  category: EquipmentCategory
  status: EquipmentStatus
  lastUpdatedBy: string
  lastUpdatedAt: string
}

export interface NewEquipmentInput {
  name: string
  category: EquipmentCategory
  status: EquipmentStatus
  createdBy: string
}

export interface LogEntry {
  id: string
  createdAt: string
  createdBy: string
  entryType: LogEntryType
  description: string
  resolved: boolean | null
}

export interface NewLogEntryInput {
  createdBy: string
  entryType: LogEntryType
  description: string
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the Supabase schema migration**

`supabase/migrations/0001_init.sql`:
```sql
create table tanks (
  id uuid primary key default gen_random_uuid(),
  gas_type text not null,
  assigned_meter text,
  psi integer not null,
  max_psi integer not null,
  status text not null check (status in ('in_use', 'spare', 'retired')),
  last_updated_by text not null,
  last_updated_at timestamptz not null default now()
);

create table equipment_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('meter_detector', 'ppe', 'tools_misc')),
  status text not null check (status in ('in_service', 'out_of_service', 'retired')),
  last_updated_by text not null,
  last_updated_at timestamptz not null default now()
);

create table log_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by text not null,
  entry_type text not null check (entry_type in ('tank_update', 'equipment_status_change', 'problem_note')),
  description text not null,
  resolved boolean
);

alter table tanks enable row level security;
alter table equipment_items enable row level security;
alter table log_entries enable row level security;

create policy "public read/write tanks" on tanks for all using (true) with check (true);
create policy "public read/write equipment" on equipment_items for all using (true) with check (true);
create policy "public read/write logs" on log_entries for all using (true) with check (true);

alter publication supabase_realtime add table tanks;
alter publication supabase_realtime add table equipment_items;
alter publication supabase_realtime add table log_entries;
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts supabase/migrations/0001_init.sql
git commit -m "Add shared domain types and Supabase schema migration"
```

---

### Task 3: Pure gauge math

**Files:**
- Create: `src/lib/gauge.ts`
- Test: `src/lib/gauge.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions, no dependencies).
- Produces: `psiPercentage(psi, maxPsi): number`, `gaugeColor(psi, maxPsi): 'red' | 'yellow' | 'green'`, `gaugeNeedleAngleDegrees(psi, maxPsi): number` — used by `TankGauge` (Task 15).

- [ ] **Step 1: Write the failing tests**

`src/lib/gauge.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { psiPercentage, gaugeColor, gaugeNeedleAngleDegrees } from './gauge'

describe('psiPercentage', () => {
  it('computes a simple percentage', () => {
    expect(psiPercentage(1108, 2216)).toBe(50)
  })

  it('clamps below zero to zero', () => {
    expect(psiPercentage(-100, 2216)).toBe(0)
  })

  it('clamps above max to 100', () => {
    expect(psiPercentage(3000, 2216)).toBe(100)
  })
})

describe('gaugeColor', () => {
  it('is red at or below 25%', () => {
    expect(gaugeColor(554, 2216)).toBe('red')
  })

  it('is yellow between 25% and 50%', () => {
    expect(gaugeColor(1000, 2216)).toBe('yellow')
  })

  it('is green above 50%', () => {
    expect(gaugeColor(2000, 2216)).toBe('green')
  })
})

describe('gaugeNeedleAngleDegrees', () => {
  it('points to -90 degrees at 0%', () => {
    expect(gaugeNeedleAngleDegrees(0, 2216)).toBe(-90)
  })

  it('points to 0 degrees at 50%', () => {
    expect(gaugeNeedleAngleDegrees(1108, 2216)).toBe(0)
  })

  it('points to 90 degrees at 100%', () => {
    expect(gaugeNeedleAngleDegrees(2216, 2216)).toBe(90)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/gauge.test.ts`
Expected: FAIL — `Cannot find module './gauge'`.

- [ ] **Step 3: Write the implementation**

`src/lib/gauge.ts`:
```ts
export function psiPercentage(psi: number, maxPsi: number): number {
  if (maxPsi <= 0) return 0
  const pct = (psi / maxPsi) * 100
  return Math.min(100, Math.max(0, pct))
}

export type GaugeColor = 'red' | 'yellow' | 'green'

export function gaugeColor(psi: number, maxPsi: number): GaugeColor {
  const pct = psiPercentage(psi, maxPsi)
  if (pct <= 25) return 'red'
  if (pct <= 50) return 'yellow'
  return 'green'
}

export function gaugeNeedleAngleDegrees(psi: number, maxPsi: number): number {
  const pct = psiPercentage(psi, maxPsi)
  return -90 + (pct / 100) * 180
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/gauge.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gauge.ts src/lib/gauge.test.ts
git commit -m "Add pure gauge math for tank PSI display"
```

---

### Task 4: Change descriptions + footnote formatting

**Files:**
- Create: `src/lib/changeDescriptions.ts`
- Create: `src/lib/formatFootnote.ts`
- Test: `src/lib/changeDescriptions.test.ts`
- Test: `src/lib/formatFootnote.test.ts`

**Interfaces:**
- Consumes: `Tank`, `TankStatus`, `EquipmentItem`, `EquipmentStatus`, `LogEntry` from `src/lib/types.ts` (Task 2).
- Produces: `describeTankPsiChange(tank, newPsi): string`, `describeTankStatusChange(tank, newStatus): string`, `describeEquipmentStatusChange(item, newStatus): string`, `formatFootnote(entry): string` — used by the tank/equipment services (Tasks 6-7) and `ProblemsBanner` (Task 17).

- [ ] **Step 1: Write the failing tests**

`src/lib/changeDescriptions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  describeTankPsiChange,
  describeTankStatusChange,
  describeEquipmentStatusChange,
} from './changeDescriptions'
import type { EquipmentItem, Tank } from './types'

const tank: Tank = {
  id: '1',
  gasType: 'Methane',
  assignedMeter: 'Meter 1',
  psi: 2200,
  maxPsi: 2216,
  status: 'in_use',
  lastUpdatedBy: 'J. Smith',
  lastUpdatedAt: '2026-07-30T18:00:00.000Z',
}

const item: EquipmentItem = {
  id: '1',
  name: 'SCBA Pack 3',
  category: 'ppe',
  status: 'in_service',
  lastUpdatedBy: 'J. Smith',
  lastUpdatedAt: '2026-07-30T18:00:00.000Z',
}

describe('describeTankPsiChange', () => {
  it('describes a PSI change with gas type and meter', () => {
    expect(describeTankPsiChange(tank, 1800)).toBe(
      'Methane tank (Meter 1) PSI updated from 2200 to 1800'
    )
  })

  it('falls back to "unassigned" when there is no assigned meter', () => {
    expect(describeTankPsiChange({ ...tank, assignedMeter: null }, 1800)).toBe(
      'Methane tank (unassigned) PSI updated from 2200 to 1800'
    )
  })
})

describe('describeTankStatusChange', () => {
  it('describes a status change', () => {
    expect(describeTankStatusChange(tank, 'spare')).toBe(
      'Methane tank (Meter 1) status changed from in_use to spare'
    )
  })
})

describe('describeEquipmentStatusChange', () => {
  it('describes an equipment status change', () => {
    expect(describeEquipmentStatusChange(item, 'out_of_service')).toBe(
      'SCBA Pack 3 status changed from in_service to out_of_service'
    )
  })
})
```

`src/lib/formatFootnote.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatFootnote } from './formatFootnote'
import type { LogEntry } from './types'

describe('formatFootnote', () => {
  it('formats as "— name, Mon D"', () => {
    const entry: LogEntry = {
      id: '1',
      createdAt: '2026-07-30T18:00:00.000Z',
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    }
    expect(formatFootnote(entry)).toBe('— J. Smith, Jul 30')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/changeDescriptions.test.ts src/lib/formatFootnote.test.ts`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write the implementations**

`src/lib/changeDescriptions.ts`:
```ts
import type { EquipmentItem, EquipmentStatus, Tank, TankStatus } from './types'

export function describeTankPsiChange(tank: Tank, newPsi: number): string {
  return `${tank.gasType} tank (${tank.assignedMeter ?? 'unassigned'}) PSI updated from ${tank.psi} to ${newPsi}`
}

export function describeTankStatusChange(tank: Tank, newStatus: TankStatus): string {
  return `${tank.gasType} tank (${tank.assignedMeter ?? 'unassigned'}) status changed from ${tank.status} to ${newStatus}`
}

export function describeEquipmentStatusChange(item: EquipmentItem, newStatus: EquipmentStatus): string {
  return `${item.name} status changed from ${item.status} to ${newStatus}`
}
```

`src/lib/formatFootnote.ts`:
```ts
import type { LogEntry } from './types'

export function formatFootnote(entry: LogEntry): string {
  const date = new Date(entry.createdAt)
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return `— ${entry.createdBy}, ${formatted}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/changeDescriptions.test.ts src/lib/formatFootnote.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/changeDescriptions.ts src/lib/changeDescriptions.test.ts src/lib/formatFootnote.ts src/lib/formatFootnote.test.ts
git commit -m "Add pure log description and footnote formatting helpers"
```

---

### Task 5: Repository interface + InMemoryRepository

**Files:**
- Create: `src/lib/repository.ts`
- Test: `src/lib/repository.test.ts`

**Interfaces:**
- Consumes: all types from Task 2.
- Produces: `Repository` interface and `InMemoryRepository` class with methods `getTanks`, `getTank`, `insertTank`, `updateTank`, `getEquipmentItems`, `getEquipmentItem`, `insertEquipmentItem`, `updateEquipmentItem`, `getLogEntries`, `insertLogEntry`, `resolveLogEntry` — used by every service (Tasks 6-8), `SupabaseRepository` (Task 9), and all API route tests (Tasks 10-12).

- [ ] **Step 1: Write the failing tests**

`src/lib/repository.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from './repository'

describe('InMemoryRepository', () => {
  it('inserts and lists tanks', async () => {
    const repo = new InMemoryRepository()
    const tank = await repo.insertTank({
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      createdBy: 'J. Smith',
    })
    expect(tank.id).toBeTruthy()
    expect(await repo.getTanks()).toEqual([tank])
  })

  it('updates a tank and stamps who/when', async () => {
    const repo = new InMemoryRepository()
    const tank = await repo.insertTank({
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      createdBy: 'J. Smith',
    })
    const updated = await repo.updateTank(tank.id, { psi: 1800 }, 'A. Lee')
    expect(updated.psi).toBe(1800)
    expect(updated.lastUpdatedBy).toBe('A. Lee')
  })

  it('throws when updating a tank that does not exist', async () => {
    const repo = new InMemoryRepository()
    await expect(repo.updateTank('missing', { psi: 1 }, 'A. Lee')).rejects.toThrow(
      'Tank not found: missing'
    )
  })

  it('inserts and updates equipment items', async () => {
    const repo = new InMemoryRepository()
    const item = await repo.insertEquipmentItem({
      name: 'SCBA Pack 3',
      category: 'ppe',
      status: 'in_service',
      createdBy: 'J. Smith',
    })
    const updated = await repo.updateEquipmentItem(item.id, { status: 'out_of_service' }, 'A. Lee')
    expect(updated.status).toBe('out_of_service')
    expect(updated.lastUpdatedBy).toBe('A. Lee')
  })

  it('sets resolved=false for new problem notes and null for other log types', async () => {
    const repo = new InMemoryRepository()
    const problem = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
    })
    const update = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'tank_update',
      description: 'Methane tank PSI updated from 2200 to 1800',
    })
    expect(problem.resolved).toBe(false)
    expect(update.resolved).toBeNull()
  })

  it('resolves a problem note', async () => {
    const repo = new InMemoryRepository()
    const problem = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
    })
    const resolved = await repo.resolveLogEntry(problem.id)
    expect(resolved.resolved).toBe(true)
  })

  it('lists log entries newest first', async () => {
    const repo = new InMemoryRepository()
    const first = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'first',
    })
    const second = await repo.insertLogEntry({
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'second',
    })
    expect((await repo.getLogEntries()).map((e) => e.id)).toEqual([second.id, first.id])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/repository.test.ts`
Expected: FAIL — `Cannot find module './repository'`.

- [ ] **Step 3: Write the implementation**

`src/lib/repository.ts`:
```ts
import type {
  EquipmentItem,
  LogEntry,
  NewEquipmentInput,
  NewLogEntryInput,
  NewTankInput,
  Tank,
} from './types'

export interface Repository {
  getTanks(): Promise<Tank[]>
  getTank(id: string): Promise<Tank | null>
  insertTank(input: NewTankInput): Promise<Tank>
  updateTank(
    id: string,
    changes: Partial<Pick<Tank, 'psi' | 'status' | 'gasType' | 'assignedMeter'>>,
    updatedBy: string
  ): Promise<Tank>

  getEquipmentItems(): Promise<EquipmentItem[]>
  getEquipmentItem(id: string): Promise<EquipmentItem | null>
  insertEquipmentItem(input: NewEquipmentInput): Promise<EquipmentItem>
  updateEquipmentItem(
    id: string,
    changes: Partial<Pick<EquipmentItem, 'status' | 'name' | 'category'>>,
    updatedBy: string
  ): Promise<EquipmentItem>

  getLogEntries(): Promise<LogEntry[]>
  insertLogEntry(input: NewLogEntryInput): Promise<LogEntry>
  resolveLogEntry(id: string): Promise<LogEntry>
}

export class InMemoryRepository implements Repository {
  private tanks: Tank[] = []
  private equipmentItems: EquipmentItem[] = []
  private logEntries: LogEntry[] = []

  async getTanks(): Promise<Tank[]> {
    return [...this.tanks]
  }

  async getTank(id: string): Promise<Tank | null> {
    return this.tanks.find((t) => t.id === id) ?? null
  }

  async insertTank(input: NewTankInput): Promise<Tank> {
    const tank: Tank = {
      id: crypto.randomUUID(),
      gasType: input.gasType,
      assignedMeter: input.assignedMeter,
      psi: input.psi,
      maxPsi: input.maxPsi,
      status: input.status,
      lastUpdatedBy: input.createdBy,
      lastUpdatedAt: new Date().toISOString(),
    }
    this.tanks.push(tank)
    return tank
  }

  async updateTank(
    id: string,
    changes: Partial<Pick<Tank, 'psi' | 'status' | 'gasType' | 'assignedMeter'>>,
    updatedBy: string
  ): Promise<Tank> {
    const existing = await this.getTank(id)
    if (!existing) throw new Error(`Tank not found: ${id}`)
    const updated: Tank = {
      ...existing,
      ...changes,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date().toISOString(),
    }
    this.tanks = this.tanks.map((t) => (t.id === id ? updated : t))
    return updated
  }

  async getEquipmentItems(): Promise<EquipmentItem[]> {
    return [...this.equipmentItems]
  }

  async getEquipmentItem(id: string): Promise<EquipmentItem | null> {
    return this.equipmentItems.find((e) => e.id === id) ?? null
  }

  async insertEquipmentItem(input: NewEquipmentInput): Promise<EquipmentItem> {
    const item: EquipmentItem = {
      id: crypto.randomUUID(),
      name: input.name,
      category: input.category,
      status: input.status,
      lastUpdatedBy: input.createdBy,
      lastUpdatedAt: new Date().toISOString(),
    }
    this.equipmentItems.push(item)
    return item
  }

  async updateEquipmentItem(
    id: string,
    changes: Partial<Pick<EquipmentItem, 'status' | 'name' | 'category'>>,
    updatedBy: string
  ): Promise<EquipmentItem> {
    const existing = await this.getEquipmentItem(id)
    if (!existing) throw new Error(`Equipment item not found: ${id}`)
    const updated: EquipmentItem = {
      ...existing,
      ...changes,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date().toISOString(),
    }
    this.equipmentItems = this.equipmentItems.map((e) => (e.id === id ? updated : e))
    return updated
  }

  async getLogEntries(): Promise<LogEntry[]> {
    return [...this.logEntries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }

  async insertLogEntry(input: NewLogEntryInput): Promise<LogEntry> {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      entryType: input.entryType,
      description: input.description,
      resolved: input.entryType === 'problem_note' ? false : null,
    }
    this.logEntries.push(entry)
    return entry
  }

  async resolveLogEntry(id: string): Promise<LogEntry> {
    const existing = this.logEntries.find((e) => e.id === id)
    if (!existing) throw new Error(`Log entry not found: ${id}`)
    const updated: LogEntry = { ...existing, resolved: true }
    this.logEntries = this.logEntries.map((e) => (e.id === id ? updated : e))
    return updated
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/repository.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/repository.ts src/lib/repository.test.ts
git commit -m "Add Repository interface and in-memory test implementation"
```

---

### Task 6: Tank service

**Files:**
- Create: `src/lib/services/tankService.ts`
- Test: `src/lib/services/tankService.test.ts`

**Interfaces:**
- Consumes: `Repository`, `InMemoryRepository` (Task 5); `Tank`, `TankStatus`, `NewTankInput` (Task 2); `describeTankPsiChange`, `describeTankStatusChange` (Task 4).
- Produces: `addTank(repo, input): Promise<Tank>`, `applyTankUpdate(repo, id, changes: { psi?: number; status?: TankStatus }, updatedBy: string): Promise<Tank>` — used by the tanks API routes (Task 10).

- [ ] **Step 1: Write the failing tests**

`src/lib/services/tankService.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from '../repository'
import { addTank, applyTankUpdate } from './tankService'

function baseInput() {
  return {
    gasType: 'Methane',
    assignedMeter: 'Meter 1',
    psi: 2200,
    maxPsi: 2216,
    status: 'in_use' as const,
    createdBy: 'J. Smith',
  }
}

describe('addTank', () => {
  it('creates a tank via the repository', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    expect(tank.gasType).toBe('Methane')
    expect(await repo.getTanks()).toEqual([tank])
  })
})

describe('applyTankUpdate', () => {
  it('logs a PSI change and updates the tank', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    const updated = await applyTankUpdate(repo, tank.id, { psi: 1800 }, 'A. Lee')
    expect(updated.psi).toBe(1800)
    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toBe('Methane tank (Meter 1) PSI updated from 2200 to 1800')
    expect(logs[0].entryType).toBe('tank_update')
  })

  it('logs a status change and updates the tank', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    await applyTankUpdate(repo, tank.id, { status: 'spare' }, 'A. Lee')
    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toBe('Methane tank (Meter 1) status changed from in_use to spare')
  })

  it('logs both changes when PSI and status change together', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    await applyTankUpdate(repo, tank.id, { psi: 1800, status: 'spare' }, 'A. Lee')
    expect(await repo.getLogEntries()).toHaveLength(2)
  })

  it('does not log anything when nothing actually changed', async () => {
    const repo = new InMemoryRepository()
    const tank = await addTank(repo, baseInput())
    await applyTankUpdate(repo, tank.id, { psi: 2200 }, 'A. Lee')
    expect(await repo.getLogEntries()).toHaveLength(0)
  })

  it('throws when the tank does not exist', async () => {
    const repo = new InMemoryRepository()
    await expect(applyTankUpdate(repo, 'missing', { psi: 1 }, 'A. Lee')).rejects.toThrow(
      'Tank not found: missing'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/services/tankService.test.ts`
Expected: FAIL — `Cannot find module './tankService'`.

- [ ] **Step 3: Write the implementation**

`src/lib/services/tankService.ts`:
```ts
import type { Repository } from '../repository'
import type { NewTankInput, Tank, TankStatus } from '../types'
import { describeTankPsiChange, describeTankStatusChange } from '../changeDescriptions'

export async function addTank(repo: Repository, input: NewTankInput): Promise<Tank> {
  return repo.insertTank(input)
}

export interface TankUpdateChanges {
  psi?: number
  status?: TankStatus
}

export async function applyTankUpdate(
  repo: Repository,
  id: string,
  changes: TankUpdateChanges,
  updatedBy: string
): Promise<Tank> {
  const existing = await repo.getTank(id)
  if (!existing) throw new Error(`Tank not found: ${id}`)

  if (changes.psi !== undefined && changes.psi !== existing.psi) {
    await repo.insertLogEntry({
      createdBy: updatedBy,
      entryType: 'tank_update',
      description: describeTankPsiChange(existing, changes.psi),
    })
  }

  if (changes.status !== undefined && changes.status !== existing.status) {
    await repo.insertLogEntry({
      createdBy: updatedBy,
      entryType: 'tank_update',
      description: describeTankStatusChange(existing, changes.status),
    })
  }

  return repo.updateTank(id, changes, updatedBy)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/tankService.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/tankService.ts src/lib/services/tankService.test.ts
git commit -m "Add tank service with automatic change logging"
```

---

### Task 7: Equipment service

**Files:**
- Create: `src/lib/services/equipmentService.ts`
- Test: `src/lib/services/equipmentService.test.ts`

**Interfaces:**
- Consumes: `Repository`, `InMemoryRepository` (Task 5); `EquipmentItem`, `EquipmentStatus`, `NewEquipmentInput` (Task 2); `describeEquipmentStatusChange` (Task 4).
- Produces: `addEquipmentItem(repo, input): Promise<EquipmentItem>`, `applyEquipmentStatusChange(repo, id, status, updatedBy): Promise<EquipmentItem>` — used by the equipment API routes (Task 11).

- [ ] **Step 1: Write the failing tests**

`src/lib/services/equipmentService.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from '../repository'
import { addEquipmentItem, applyEquipmentStatusChange } from './equipmentService'

function baseInput() {
  return {
    name: 'SCBA Pack 3',
    category: 'ppe' as const,
    status: 'in_service' as const,
    createdBy: 'J. Smith',
  }
}

describe('addEquipmentItem', () => {
  it('creates an equipment item via the repository', async () => {
    const repo = new InMemoryRepository()
    const item = await addEquipmentItem(repo, baseInput())
    expect(item.name).toBe('SCBA Pack 3')
    expect(await repo.getEquipmentItems()).toEqual([item])
  })
})

describe('applyEquipmentStatusChange', () => {
  it('logs the change and updates the item', async () => {
    const repo = new InMemoryRepository()
    const item = await addEquipmentItem(repo, baseInput())
    const updated = await applyEquipmentStatusChange(repo, item.id, 'out_of_service', 'A. Lee')
    expect(updated.status).toBe('out_of_service')
    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toBe('SCBA Pack 3 status changed from in_service to out_of_service')
    expect(logs[0].entryType).toBe('equipment_status_change')
  })

  it('does not log anything when the status is unchanged', async () => {
    const repo = new InMemoryRepository()
    const item = await addEquipmentItem(repo, baseInput())
    await applyEquipmentStatusChange(repo, item.id, 'in_service', 'A. Lee')
    expect(await repo.getLogEntries()).toHaveLength(0)
  })

  it('throws when the item does not exist', async () => {
    const repo = new InMemoryRepository()
    await expect(
      applyEquipmentStatusChange(repo, 'missing', 'out_of_service', 'A. Lee')
    ).rejects.toThrow('Equipment item not found: missing')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/services/equipmentService.test.ts`
Expected: FAIL — `Cannot find module './equipmentService'`.

- [ ] **Step 3: Write the implementation**

`src/lib/services/equipmentService.ts`:
```ts
import type { Repository } from '../repository'
import type { EquipmentItem, EquipmentStatus, NewEquipmentInput } from '../types'
import { describeEquipmentStatusChange } from '../changeDescriptions'

export async function addEquipmentItem(
  repo: Repository,
  input: NewEquipmentInput
): Promise<EquipmentItem> {
  return repo.insertEquipmentItem(input)
}

export async function applyEquipmentStatusChange(
  repo: Repository,
  id: string,
  status: EquipmentStatus,
  updatedBy: string
): Promise<EquipmentItem> {
  const existing = await repo.getEquipmentItem(id)
  if (!existing) throw new Error(`Equipment item not found: ${id}`)

  if (status !== existing.status) {
    await repo.insertLogEntry({
      createdBy: updatedBy,
      entryType: 'equipment_status_change',
      description: describeEquipmentStatusChange(existing, status),
    })
  }

  return repo.updateEquipmentItem(id, { status }, updatedBy)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/equipmentService.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/equipmentService.ts src/lib/services/equipmentService.test.ts
git commit -m "Add equipment service with automatic change logging"
```

---

### Task 8: Log service

**Files:**
- Create: `src/lib/services/logService.ts`
- Test: `src/lib/services/logService.test.ts`

**Interfaces:**
- Consumes: `Repository`, `InMemoryRepository` (Task 5); `LogEntry` (Task 2).
- Produces: `addProblemNote(repo, description, createdBy): Promise<LogEntry>`, `resolveProblemNote(repo, id): Promise<LogEntry>` — used by the logs API routes (Task 12).

- [ ] **Step 1: Write the failing tests**

`src/lib/services/logService.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from '../repository'
import { addProblemNote, resolveProblemNote } from './logService'

describe('addProblemNote', () => {
  it('creates an unresolved problem_note entry', async () => {
    const repo = new InMemoryRepository()
    const entry = await addProblemNote(repo, 'Decon pump leaking', 'J. Smith')
    expect(entry.entryType).toBe('problem_note')
    expect(entry.resolved).toBe(false)
    expect(entry.description).toBe('Decon pump leaking')
  })
})

describe('resolveProblemNote', () => {
  it('marks a problem note resolved', async () => {
    const repo = new InMemoryRepository()
    const entry = await addProblemNote(repo, 'Decon pump leaking', 'J. Smith')
    const resolved = await resolveProblemNote(repo, entry.id)
    expect(resolved.resolved).toBe(true)
  })

  it('throws when the entry does not exist', async () => {
    const repo = new InMemoryRepository()
    await expect(resolveProblemNote(repo, 'missing')).rejects.toThrow('Log entry not found: missing')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/services/logService.test.ts`
Expected: FAIL — `Cannot find module './logService'`.

- [ ] **Step 3: Write the implementation**

`src/lib/services/logService.ts`:
```ts
import type { Repository } from '../repository'
import type { LogEntry } from '../types'

export async function addProblemNote(
  repo: Repository,
  description: string,
  createdBy: string
): Promise<LogEntry> {
  return repo.insertLogEntry({
    createdBy,
    entryType: 'problem_note',
    description,
  })
}

export async function resolveProblemNote(repo: Repository, id: string): Promise<LogEntry> {
  return repo.resolveLogEntry(id)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/logService.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/logService.ts src/lib/services/logService.test.ts
git commit -m "Add log service for problem notes"
```

---

### Task 9: Supabase repository adapter + client factory

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Create: `src/lib/supabaseRepository.ts`
- Create: `src/lib/repositoryFactory.ts`
- Test: `src/lib/supabaseRepository.test.ts`

**Interfaces:**
- Consumes: `Repository` (Task 5); all types (Task 2).
- Produces: `getSupabaseClient(): SupabaseClient` (used by the realtime hook in Task 13 and both pages in Tasks 18-19); `SupabaseRepository` class implementing `Repository`; `mapRowToTank`, `mapRowToEquipmentItem`, `mapRowToLogEntry` (row-mapping functions, unit tested directly); `getRepository(): Repository` and `__setRepositoryForTests(repo: Repository | null): void` from `repositoryFactory.ts` — used by every API route (Tasks 10-12) and their tests.

- [ ] **Step 1: Write the failing tests**

`src/lib/supabaseRepository.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mapRowToTank, mapRowToEquipmentItem, mapRowToLogEntry } from './supabaseRepository'

describe('mapRowToTank', () => {
  it('converts a snake_case row to a Tank', () => {
    const row = {
      id: '1',
      gas_type: 'Methane',
      assigned_meter: 'Meter 1',
      psi: 2200,
      max_psi: 2216,
      status: 'in_use',
      last_updated_by: 'J. Smith',
      last_updated_at: '2026-07-30T18:00:00.000Z',
    }
    expect(mapRowToTank(row)).toEqual({
      id: '1',
      gasType: 'Methane',
      assignedMeter: 'Meter 1',
      psi: 2200,
      maxPsi: 2216,
      status: 'in_use',
      lastUpdatedBy: 'J. Smith',
      lastUpdatedAt: '2026-07-30T18:00:00.000Z',
    })
  })
})

describe('mapRowToEquipmentItem', () => {
  it('converts a snake_case row to an EquipmentItem', () => {
    const row = {
      id: '1',
      name: 'SCBA Pack 3',
      category: 'ppe',
      status: 'in_service',
      last_updated_by: 'J. Smith',
      last_updated_at: '2026-07-30T18:00:00.000Z',
    }
    expect(mapRowToEquipmentItem(row)).toEqual({
      id: '1',
      name: 'SCBA Pack 3',
      category: 'ppe',
      status: 'in_service',
      lastUpdatedBy: 'J. Smith',
      lastUpdatedAt: '2026-07-30T18:00:00.000Z',
    })
  })
})

describe('mapRowToLogEntry', () => {
  it('converts a snake_case row to a LogEntry', () => {
    const row = {
      id: '1',
      created_at: '2026-07-30T18:00:00.000Z',
      created_by: 'J. Smith',
      entry_type: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    }
    expect(mapRowToLogEntry(row)).toEqual({
      id: '1',
      createdAt: '2026-07-30T18:00:00.000Z',
      createdBy: 'J. Smith',
      entryType: 'problem_note',
      description: 'Decon pump leaking',
      resolved: false,
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/supabaseRepository.test.ts`
Expected: FAIL — `Cannot find module './supabaseRepository'`.

- [ ] **Step 3: Write the client factory**

`src/lib/supabaseClient.ts`:
```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
    )
  }

  cachedClient = createClient(url, anonKey)
  return cachedClient
}
```

- [ ] **Step 4: Write the Supabase repository adapter**

`src/lib/supabaseRepository.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Repository } from './repository'
import type {
  EquipmentItem,
  LogEntry,
  NewEquipmentInput,
  NewLogEntryInput,
  NewTankInput,
  Tank,
} from './types'
import { getSupabaseClient } from './supabaseClient'

export function mapRowToTank(row: any): Tank {
  return {
    id: row.id,
    gasType: row.gas_type,
    assignedMeter: row.assigned_meter,
    psi: row.psi,
    maxPsi: row.max_psi,
    status: row.status,
    lastUpdatedBy: row.last_updated_by,
    lastUpdatedAt: row.last_updated_at,
  }
}

export function mapRowToEquipmentItem(row: any): EquipmentItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    lastUpdatedBy: row.last_updated_by,
    lastUpdatedAt: row.last_updated_at,
  }
}

export function mapRowToLogEntry(row: any): LogEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    entryType: row.entry_type,
    description: row.description,
    resolved: row.resolved,
  }
}

export class SupabaseRepository implements Repository {
  private client: SupabaseClient

  constructor(client: SupabaseClient = getSupabaseClient()) {
    this.client = client
  }

  async getTanks(): Promise<Tank[]> {
    const { data, error } = await this.client.from('tanks').select('*').order('gas_type')
    if (error) throw error
    return (data ?? []).map(mapRowToTank)
  }

  async getTank(id: string): Promise<Tank | null> {
    const { data, error } = await this.client.from('tanks').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? mapRowToTank(data) : null
  }

  async insertTank(input: NewTankInput): Promise<Tank> {
    const { data, error } = await this.client
      .from('tanks')
      .insert({
        gas_type: input.gasType,
        assigned_meter: input.assignedMeter,
        psi: input.psi,
        max_psi: input.maxPsi,
        status: input.status,
        last_updated_by: input.createdBy,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapRowToTank(data)
  }

  async updateTank(
    id: string,
    changes: Partial<Pick<Tank, 'psi' | 'status' | 'gasType' | 'assignedMeter'>>,
    updatedBy: string
  ): Promise<Tank> {
    const { data, error } = await this.client
      .from('tanks')
      .update({
        ...(changes.psi !== undefined ? { psi: changes.psi } : {}),
        ...(changes.status !== undefined ? { status: changes.status } : {}),
        ...(changes.gasType !== undefined ? { gas_type: changes.gasType } : {}),
        ...(changes.assignedMeter !== undefined ? { assigned_meter: changes.assignedMeter } : {}),
        last_updated_by: updatedBy,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapRowToTank(data)
  }

  async getEquipmentItems(): Promise<EquipmentItem[]> {
    const { data, error } = await this.client.from('equipment_items').select('*').order('name')
    if (error) throw error
    return (data ?? []).map(mapRowToEquipmentItem)
  }

  async getEquipmentItem(id: string): Promise<EquipmentItem | null> {
    const { data, error } = await this.client
      .from('equipment_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? mapRowToEquipmentItem(data) : null
  }

  async insertEquipmentItem(input: NewEquipmentInput): Promise<EquipmentItem> {
    const { data, error } = await this.client
      .from('equipment_items')
      .insert({
        name: input.name,
        category: input.category,
        status: input.status,
        last_updated_by: input.createdBy,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapRowToEquipmentItem(data)
  }

  async updateEquipmentItem(
    id: string,
    changes: Partial<Pick<EquipmentItem, 'status' | 'name' | 'category'>>,
    updatedBy: string
  ): Promise<EquipmentItem> {
    const { data, error } = await this.client
      .from('equipment_items')
      .update({
        ...(changes.status !== undefined ? { status: changes.status } : {}),
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.category !== undefined ? { category: changes.category } : {}),
        last_updated_by: updatedBy,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapRowToEquipmentItem(data)
  }

  async getLogEntries(): Promise<LogEntry[]> {
    const { data, error } = await this.client
      .from('log_entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapRowToLogEntry)
  }

  async insertLogEntry(input: NewLogEntryInput): Promise<LogEntry> {
    const { data, error } = await this.client
      .from('log_entries')
      .insert({
        created_by: input.createdBy,
        entry_type: input.entryType,
        description: input.description,
        resolved: input.entryType === 'problem_note' ? false : null,
      })
      .select('*')
      .single()
    if (error) throw error
    return mapRowToLogEntry(data)
  }

  async resolveLogEntry(id: string): Promise<LogEntry> {
    const { data, error } = await this.client
      .from('log_entries')
      .update({ resolved: true })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return mapRowToLogEntry(data)
  }
}
```

- [ ] **Step 5: Write the repository factory**

`src/lib/repositoryFactory.ts`:
```ts
import type { Repository } from './repository'
import { SupabaseRepository } from './supabaseRepository'

let testOverride: Repository | null = null

export function __setRepositoryForTests(repo: Repository | null): void {
  testOverride = repo
}

export function getRepository(): Repository {
  if (testOverride) return testOverride
  return new SupabaseRepository()
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/supabaseRepository.test.ts`
Expected: PASS (3 tests). Note: these tests only exercise the pure row-mapping functions — no network call is made, since `SupabaseRepository` is never instantiated in this test file.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabaseClient.ts src/lib/supabaseRepository.ts src/lib/supabaseRepository.test.ts src/lib/repositoryFactory.ts
git commit -m "Add Supabase-backed repository adapter and repository factory"
```

---

### Task 10: API routes — tanks

**Files:**
- Create: `src/app/api/tanks/route.ts`
- Create: `src/app/api/tanks/[id]/route.ts`
- Test: `src/app/api/tanks/route.test.ts`
- Test: `src/app/api/tanks/[id]/route.test.ts`

**Interfaces:**
- Consumes: `getRepository`, `__setRepositoryForTests` (Task 9); `addTank`, `applyTankUpdate` (Task 6); `InMemoryRepository` (Task 5).
- Produces: `GET /api/tanks`, `POST /api/tanks`, `PATCH /api/tanks/:id` — consumed by `TankSection`/`AddTankForm` (Task 15) and the dashboard page (Task 19).

- [ ] **Step 1: Write the failing tests**

`src/app/api/tanks/route.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

describe('/api/tanks', () => {
  beforeEach(() => {
    __setRepositoryForTests(new InMemoryRepository())
  })

  it('POST creates a tank and GET lists it', async () => {
    const postRequest = new NextRequest('http://localhost/api/tanks', {
      method: 'POST',
      body: JSON.stringify({
        gasType: 'Methane',
        assignedMeter: 'Meter 1',
        psi: 2200,
        maxPsi: 2216,
        status: 'in_use',
        createdBy: 'J. Smith',
      }),
      headers: { 'content-type': 'application/json' },
    })

    const postResponse = await POST(postRequest)
    expect(postResponse.status).toBe(201)
    const created = await postResponse.json()
    expect(created.gasType).toBe('Methane')

    const getResponse = await GET()
    const tanks = await getResponse.json()
    expect(tanks).toHaveLength(1)
    expect(tanks[0].id).toBe(created.id)
  })
})
```

`src/app/api/tanks/[id]/route.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'
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
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/tanks`
Expected: FAIL — both route modules missing.

- [ ] **Step 3: Write the implementation**

`src/app/api/tanks/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { addTank } from '@/lib/services/tankService'
import type { NewTankInput } from '@/lib/types'

export async function GET() {
  const repo = getRepository()
  const tanks = await repo.getTanks()
  return NextResponse.json(tanks)
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as NewTankInput
  const repo = getRepository()
  const tank = await addTank(repo, body)
  return NextResponse.json(tank, { status: 201 })
}
```

`src/app/api/tanks/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { applyTankUpdate } from '@/lib/services/tankService'
import type { TankStatus } from '@/lib/types'

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/tanks`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tanks
git commit -m "Add tanks API routes"
```

---

### Task 11: API routes — equipment

**Files:**
- Create: `src/app/api/equipment/route.ts`
- Create: `src/app/api/equipment/[id]/route.ts`
- Test: `src/app/api/equipment/route.test.ts`
- Test: `src/app/api/equipment/[id]/route.test.ts`

**Interfaces:**
- Consumes: `getRepository`, `__setRepositoryForTests` (Task 9); `addEquipmentItem`, `applyEquipmentStatusChange` (Task 7); `InMemoryRepository` (Task 5).
- Produces: `GET /api/equipment`, `POST /api/equipment`, `PATCH /api/equipment/:id` — consumed by `EquipmentSection`/`AddEquipmentForm` (Task 16) and the dashboard page (Task 19).

- [ ] **Step 1: Write the failing tests**

`src/app/api/equipment/route.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

describe('/api/equipment', () => {
  beforeEach(() => {
    __setRepositoryForTests(new InMemoryRepository())
  })

  it('POST creates an equipment item and GET lists it', async () => {
    const postRequest = new NextRequest('http://localhost/api/equipment', {
      method: 'POST',
      body: JSON.stringify({
        name: 'SCBA Pack 3',
        category: 'ppe',
        status: 'in_service',
        createdBy: 'J. Smith',
      }),
      headers: { 'content-type': 'application/json' },
    })

    const postResponse = await POST(postRequest)
    expect(postResponse.status).toBe(201)
    const created = await postResponse.json()
    expect(created.name).toBe('SCBA Pack 3')

    const getResponse = await GET()
    const items = await getResponse.json()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(created.id)
  })
})
```

`src/app/api/equipment/[id]/route.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { addEquipmentItem } from '@/lib/services/equipmentService'

describe('/api/equipment/[id]', () => {
  it('PATCH updates status and logs the change', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const item = await addEquipmentItem(repo, {
      name: 'SCBA Pack 3',
      category: 'ppe',
      status: 'in_service',
      createdBy: 'J. Smith',
    })

    const request = new NextRequest(`http://localhost/api/equipment/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'out_of_service', updatedBy: 'A. Lee' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await PATCH(request, { params: { id: item.id } })
    const updated = await response.json()
    expect(updated.status).toBe('out_of_service')

    const logs = await repo.getLogEntries()
    expect(logs).toHaveLength(1)
    expect(logs[0].description).toContain('status changed from in_service to out_of_service')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/equipment`
Expected: FAIL — both route modules missing.

- [ ] **Step 3: Write the implementation**

`src/app/api/equipment/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { addEquipmentItem } from '@/lib/services/equipmentService'
import type { NewEquipmentInput } from '@/lib/types'

export async function GET() {
  const repo = getRepository()
  const items = await repo.getEquipmentItems()
  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as NewEquipmentInput
  const repo = getRepository()
  const item = await addEquipmentItem(repo, body)
  return NextResponse.json(item, { status: 201 })
}
```

`src/app/api/equipment/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { applyEquipmentStatusChange } from '@/lib/services/equipmentService'
import type { EquipmentStatus } from '@/lib/types'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { status: EquipmentStatus; updatedBy: string }
  const repo = getRepository()
  const item = await applyEquipmentStatusChange(repo, params.id, body.status, body.updatedBy)
  return NextResponse.json(item)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/equipment`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/equipment
git commit -m "Add equipment API routes"
```

---

### Task 12: API routes — logs

**Files:**
- Create: `src/app/api/logs/route.ts`
- Create: `src/app/api/logs/[id]/route.ts`
- Test: `src/app/api/logs/route.test.ts`
- Test: `src/app/api/logs/[id]/route.test.ts`

**Interfaces:**
- Consumes: `getRepository`, `__setRepositoryForTests` (Task 9); `addProblemNote`, `resolveProblemNote` (Task 8); `InMemoryRepository` (Task 5).
- Produces: `GET /api/logs`, `POST /api/logs`, `PATCH /api/logs/:id` — consumed by `NewProblemForm`/`LogTable` (Tasks 17-18) and the dashboard page (Task 19).

- [ ] **Step 1: Write the failing tests**

`src/app/api/logs/route.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

describe('/api/logs', () => {
  beforeEach(() => {
    __setRepositoryForTests(new InMemoryRepository())
  })

  it('POST creates a problem note and GET lists it', async () => {
    const postRequest = new NextRequest('http://localhost/api/logs', {
      method: 'POST',
      body: JSON.stringify({ description: 'Decon pump leaking', createdBy: 'J. Smith' }),
      headers: { 'content-type': 'application/json' },
    })

    const postResponse = await POST(postRequest)
    expect(postResponse.status).toBe(201)
    const created = await postResponse.json()
    expect(created.entryType).toBe('problem_note')
    expect(created.resolved).toBe(false)

    const getResponse = await GET()
    const entries = await getResponse.json()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe(created.id)
  })
})
```

`src/app/api/logs/[id]/route.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PATCH } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { addProblemNote } from '@/lib/services/logService'

describe('/api/logs/[id]', () => {
  it('PATCH marks a problem note resolved', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const entry = await addProblemNote(repo, 'Decon pump leaking', 'J. Smith')

    const response = await PATCH(new Request(`http://localhost/api/logs/${entry.id}`, { method: 'PATCH' }), {
      params: { id: entry.id },
    })
    const updated = await response.json()
    expect(updated.resolved).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/logs`
Expected: FAIL — both route modules missing.

- [ ] **Step 3: Write the implementation**

`src/app/api/logs/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { addProblemNote } from '@/lib/services/logService'

export async function GET() {
  const repo = getRepository()
  const entries = await repo.getLogEntries()
  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { description: string; createdBy: string }
  const repo = getRepository()
  const entry = await addProblemNote(repo, body.description, body.createdBy)
  return NextResponse.json(entry, { status: 201 })
}
```

`src/app/api/logs/[id]/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { resolveProblemNote } from '@/lib/services/logService'

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const repo = getRepository()
  const entry = await resolveProblemNote(repo, params.id)
  return NextResponse.json(entry)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/logs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/logs
git commit -m "Add logs API routes"
```

---

### Task 13: useRealtimeRefetch hook

**Files:**
- Create: `src/hooks/useRealtimeRefetch.ts`
- Test: `src/hooks/useRealtimeRefetch.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient` type from `@supabase/supabase-js`.
- Produces: `useRealtimeRefetch(client, table, onChange): void` — used by the dashboard page (Task 19) and log page (Task 18).

- [ ] **Step 1: Write the failing test**

`src/hooks/useRealtimeRefetch.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRealtimeRefetch } from './useRealtimeRefetch'

function createFakeClient() {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }
  return {
    channel: vi.fn().mockReturnValue(channel),
    removeChannel: vi.fn(),
    _channel: channel,
  }
}

describe('useRealtimeRefetch', () => {
  it('subscribes to postgres_changes for the given table and unsubscribes on cleanup', () => {
    const client = createFakeClient()
    const onChange = vi.fn()

    const { unmount } = renderHook(() => useRealtimeRefetch(client as any, 'tanks', onChange))

    expect(client.channel).toHaveBeenCalledWith('realtime:tanks')
    expect(client._channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tanks' },
      onChange
    )
    expect(client._channel.subscribe).toHaveBeenCalled()

    unmount()
    expect(client.removeChannel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useRealtimeRefetch.test.ts`
Expected: FAIL — `Cannot find module './useRealtimeRefetch'`.

- [ ] **Step 3: Write the implementation**

`src/hooks/useRealtimeRefetch.ts`:
```ts
'use client'

import { useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useRealtimeRefetch(
  client: SupabaseClient,
  table: string,
  onChange: () => void
): void {
  useEffect(() => {
    const channel = client
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [client, table, onChange])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useRealtimeRefetch.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRealtimeRefetch.ts src/hooks/useRealtimeRefetch.test.ts
git commit -m "Add realtime refetch hook for Supabase Realtime subscriptions"
```

---

### Task 14: useLocalName hook

**Files:**
- Create: `src/hooks/useLocalName.ts`
- Test: `src/hooks/useLocalName.test.ts`

**Interfaces:**
- Consumes: browser `localStorage` (available in jsdom test environment).
- Produces: `useLocalName(): [string, (name: string) => void]` — used by the dashboard page (Task 19) and log page (Task 18) so a team member only types their name once per browser.

- [ ] **Step 1: Write the failing test**

`src/hooks/useLocalName.test.ts`:
```ts
import { describe, it, expect, beforeEach, act } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLocalName } from './useLocalName'

describe('useLocalName', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts empty when nothing is stored', () => {
    const { result } = renderHook(() => useLocalName())
    expect(result.current[0]).toBe('')
  })

  it('persists the name to localStorage and reflects it in state', () => {
    const { result } = renderHook(() => useLocalName())
    act(() => {
      result.current[1]('J. Smith')
    })
    expect(result.current[0]).toBe('J. Smith')
    expect(window.localStorage.getItem('hazmat-dashboard-name')).toBe('J. Smith')
  })

  it('reads a previously stored name on mount', () => {
    window.localStorage.setItem('hazmat-dashboard-name', 'A. Lee')
    const { result } = renderHook(() => useLocalName())
    expect(result.current[0]).toBe('A. Lee')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useLocalName.test.ts`
Expected: FAIL — `Cannot find module './useLocalName'`.

- [ ] **Step 3: Write the implementation**

`src/hooks/useLocalName.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'hazmat-dashboard-name'

export function useLocalName(): [string, (name: string) => void] {
  const [name, setName] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) setName(stored)
  }, [])

  function updateName(next: string) {
    setName(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return [name, updateName]
}
```

Note: `beforeEach`/`act` are imported from `vitest` here because Vitest re-exports the React `act` helper; if that import fails, import `act` from `react` instead (`import { act } from 'react'`) — both work in this project's Vitest/React versions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useLocalName.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLocalName.ts src/hooks/useLocalName.test.ts
git commit -m "Add useLocalName hook for one-time name entry per browser"
```

---

### Task 15: TankGauge + TankControls + TankSection + AddTankForm

**Files:**
- Create: `src/components/TankGauge.tsx`
- Create: `src/components/TankControls.tsx`
- Create: `src/components/TankSection.tsx`
- Create: `src/components/AddTankForm.tsx`
- Test: `src/components/TankGauge.test.tsx`
- Test: `src/components/TankControls.test.tsx`

**Interfaces:**
- Consumes: `gaugeColor`, `gaugeNeedleAngleDegrees`, `psiPercentage` (Task 3); `Tank`, `TankStatus`, `NewTankInput` (Task 2); `POST /api/tanks`, `PATCH /api/tanks/:id` (Task 10).
- Produces: `TankGauge({ tank }): JSX.Element`, `TankControls({ tank, updatedBy, onChanged }): JSX.Element` (lets a team member update PSI/status or retire a tank — the day-to-day editing surface required by the spec, not just tank creation), `TankSection({ tanks, updatedBy, onChanged }): JSX.Element`, `AddTankForm({ updatedBy, onAdded }): JSX.Element` — used by the dashboard page (Task 19).

- [ ] **Step 1: Write the failing tests**

`src/components/TankGauge.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TankGauge } from './TankGauge'
import type { Tank } from '@/lib/types'

const baseTank: Tank = {
  id: '1',
  gasType: 'Methane',
  assignedMeter: 'Meter 1',
  psi: 2200,
  maxPsi: 2216,
  status: 'in_use',
  lastUpdatedBy: 'J. Smith',
  lastUpdatedAt: new Date().toISOString(),
}

describe('TankGauge', () => {
  it('renders green for a nearly full tank', () => {
    render(<TankGauge tank={baseTank} />)
    expect(screen.getByTestId('tank-gauge')).toHaveAttribute('data-color', 'green')
    expect(screen.getByText('Methane')).toBeInTheDocument()
    expect(screen.getByText('Meter 1')).toBeInTheDocument()
  })

  it('renders red for a nearly empty tank', () => {
    render(<TankGauge tank={{ ...baseTank, psi: 200 }} />)
    expect(screen.getByTestId('tank-gauge')).toHaveAttribute('data-color', 'red')
  })
})
```

`src/components/TankControls.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TankControls } from './TankControls'
import type { Tank } from '@/lib/types'

const tank: Tank = {
  id: '1',
  gasType: 'Methane',
  assignedMeter: 'Meter 1',
  psi: 2200,
  maxPsi: 2216,
  status: 'in_use',
  lastUpdatedBy: 'J. Smith',
  lastUpdatedAt: new Date().toISOString(),
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => tank }))
})

describe('TankControls', () => {
  it('disables Save and Retire when no name is set', () => {
    render(<TankControls tank={tank} updatedBy="" onChanged={vi.fn()} />)
    expect(screen.getByText('Save')).toBeDisabled()
    expect(screen.getByText('Retire')).toBeDisabled()
  })

  it('sends a PATCH with the edited PSI and status on Save', async () => {
    const onChanged = vi.fn()
    render(<TankControls tank={tank} updatedBy="A. Lee" onChanged={onChanged} />)
    fireEvent.change(screen.getByLabelText('PSI'), { target: { value: '1800' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tanks/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ psi: 1800, status: 'in_use', updatedBy: 'A. Lee' }),
      })
    )
  })

  it('sends a PATCH with status "retired" on Retire', async () => {
    const onChanged = vi.fn()
    render(<TankControls tank={tank} updatedBy="A. Lee" onChanged={onChanged} />)
    fireEvent.click(screen.getByText('Retire'))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tanks/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'retired', updatedBy: 'A. Lee' }),
      })
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/TankGauge.test.tsx src/components/TankControls.test.tsx`
Expected: FAIL — `Cannot find module './TankGauge'` and `Cannot find module './TankControls'`.

- [ ] **Step 3: Write the components**

`src/components/TankGauge.tsx`:
```tsx
import { gaugeColor, gaugeNeedleAngleDegrees, psiPercentage } from '@/lib/gauge'
import type { Tank } from '@/lib/types'

const COLOR_HEX: Record<'red' | 'yellow' | 'green', string> = {
  red: '#dc2626',
  yellow: '#ca8a04',
  green: '#16a34a',
}

export function TankGauge({ tank }: { tank: Tank }) {
  const color = gaugeColor(tank.psi, tank.maxPsi)
  const angle = gaugeNeedleAngleDegrees(tank.psi, tank.maxPsi)
  const pct = psiPercentage(tank.psi, tank.maxPsi)
  const needleX = 60 + 45 * Math.sin((angle * Math.PI) / 180)
  const needleY = 60 - 45 * Math.cos((angle * Math.PI) / 180)

  return (
    <div data-testid="tank-gauge" data-color={color} className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <line x1="60" y1="60" x2={needleX} y2={needleY} stroke={COLOR_HEX[color]} strokeWidth="4" />
      </svg>
      <div className="text-sm font-medium">{tank.gasType}</div>
      <div className="text-xs text-gray-500">{tank.assignedMeter ?? 'Unassigned'}</div>
      <div className="text-lg font-bold" style={{ color: COLOR_HEX[color] }}>
        {tank.psi} psi ({Math.round(pct)}%)
      </div>
    </div>
  )
}
```

`src/components/TankControls.tsx`:
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
    <div className="flex gap-2 items-end mt-1">
      <label className="flex flex-col text-xs">
        PSI
        <input
          type="number"
          value={psi}
          onChange={(e) => setPsi(e.target.value)}
          className="w-20 border px-1"
        />
      </label>
      <label className="flex flex-col text-xs">
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as TankStatus)}>
          <option value="in_use">In use</option>
          <option value="spare">Spare</option>
        </select>
      </label>
      <button
        onClick={handleSave}
        disabled={submitting || !updatedBy}
        className="text-xs underline disabled:opacity-50"
      >
        Save
      </button>
      <button
        onClick={handleRetire}
        disabled={submitting || !updatedBy}
        className="text-xs text-red-600 underline disabled:opacity-50"
      >
        Retire
      </button>
    </div>
  )
}
```

`src/components/AddTankForm.tsx`:
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <label className="flex flex-col text-sm">
        Gas type
        <input value={gasType} onChange={(e) => setGasType(e.target.value)} required />
      </label>
      <label className="flex flex-col text-sm">
        Assigned meter
        <input value={assignedMeter} onChange={(e) => setAssignedMeter(e.target.value)} />
      </label>
      <label className="flex flex-col text-sm">
        PSI
        <input type="number" value={psi} onChange={(e) => setPsi(e.target.value)} required />
      </label>
      <label className="flex flex-col text-sm">
        Max PSI
        <input type="number" value={maxPsi} onChange={(e) => setMaxPsi(e.target.value)} required />
      </label>
      <label className="flex flex-col text-sm">
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as TankStatus)}>
          <option value="in_use">In use</option>
          <option value="spare">Spare</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting || !updatedBy}
        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        Add tank
      </button>
    </form>
  )
}
```

`src/components/TankSection.tsx`:
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
    <section>
      <h2 className="text-xl font-semibold mb-2">Cylinders</h2>
      <div className="flex flex-wrap gap-4">
        {inUse.map((tank) => (
          <div key={tank.id}>
            <TankGauge tank={tank} />
            <TankControls tank={tank} updatedBy={updatedBy} onChanged={onChanged} />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-medium">Spare tanks: {spares.length}</h3>
        <ul className="text-sm">
          {spares.map((tank) => (
            <li key={tank.id} className="mb-1">
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/TankGauge.test.tsx src/components/TankControls.test.tsx`
Expected: PASS (5 tests). `TankSection` and `AddTankForm` are wired together and verified manually in Task 20's end-to-end checklist, per the spec's stated testing approach.

- [ ] **Step 5: Commit**

```bash
git add src/components/TankGauge.tsx src/components/TankGauge.test.tsx src/components/TankControls.tsx src/components/TankControls.test.tsx src/components/TankSection.tsx src/components/AddTankForm.tsx
git commit -m "Add tank gauge display and tank editing/retiring UI"
```

---

### Task 16: EquipmentSection + AddEquipmentForm

**Files:**
- Create: `src/lib/equipmentLabels.ts`
- Create: `src/components/EquipmentSection.tsx`
- Create: `src/components/AddEquipmentForm.tsx`
- Test: `src/lib/equipmentLabels.test.ts`
- Test: `src/components/EquipmentSection.test.tsx`

**Interfaces:**
- Consumes: `EquipmentCategory`, `EQUIPMENT_CATEGORIES`, `EquipmentItem`, `EquipmentStatus`, `NewEquipmentInput` (Task 2); `POST /api/equipment`, `PATCH /api/equipment/:id` (Task 11).
- Produces: `CATEGORY_LABELS: Record<EquipmentCategory, string>`, `EquipmentSection({ items, updatedBy, onChanged }): JSX.Element` (in-service/out-of-service toggle plus a Retire action, since the spec requires equipment to be retirable without ever hard-deleting it), `AddEquipmentForm({ updatedBy, onAdded }): JSX.Element` — used by the dashboard page (Task 19).

- [ ] **Step 1: Write the failing tests**

`src/lib/equipmentLabels.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { CATEGORY_LABELS } from './equipmentLabels'

describe('CATEGORY_LABELS', () => {
  it('has a display label for every category', () => {
    expect(CATEGORY_LABELS).toEqual({
      meter_detector: 'Meters & Detectors',
      ppe: 'PPE',
      tools_misc: 'Tools & Misc',
    })
  })
})
```

`src/components/EquipmentSection.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EquipmentSection } from './EquipmentSection'
import type { EquipmentItem } from '@/lib/types'

const items: EquipmentItem[] = [
  {
    id: '1',
    name: 'Meter A',
    category: 'meter_detector',
    status: 'in_service',
    lastUpdatedBy: 'J. Smith',
    lastUpdatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Suit B',
    category: 'ppe',
    status: 'out_of_service',
    lastUpdatedBy: 'J. Smith',
    lastUpdatedAt: new Date().toISOString(),
  },
]

describe('EquipmentSection', () => {
  it('groups items by category and shows correct status color', () => {
    render(<EquipmentSection items={items} updatedBy="A. Lee" onChanged={() => {}} />)
    expect(screen.getByText('Meters & Detectors')).toBeInTheDocument()
    expect(screen.getByText('PPE')).toBeInTheDocument()
    expect(screen.getByTestId('status-1')).toHaveClass('text-green-600')
    expect(screen.getByTestId('status-2')).toHaveClass('text-red-600')
  })

  it('omits categories with no active items', () => {
    render(<EquipmentSection items={items} updatedBy="A. Lee" onChanged={() => {}} />)
    expect(screen.queryByText('Tools & Misc')).not.toBeInTheDocument()
  })

  it('offers a Retire action for every active item', () => {
    render(<EquipmentSection items={items} updatedBy="A. Lee" onChanged={() => {}} />)
    expect(screen.getAllByText('Retire')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/equipmentLabels.test.ts src/components/EquipmentSection.test.tsx`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write the implementation**

`src/lib/equipmentLabels.ts`:
```ts
import type { EquipmentCategory } from './types'

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  meter_detector: 'Meters & Detectors',
  ppe: 'PPE',
  tools_misc: 'Tools & Misc',
}
```

`src/components/EquipmentSection.tsx`:
```tsx
'use client'

import { CATEGORY_LABELS } from '@/lib/equipmentLabels'
import { EQUIPMENT_CATEGORIES } from '@/lib/types'
import type { EquipmentItem, EquipmentStatus } from '@/lib/types'

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
    <section>
      <h2 className="text-xl font-semibold mb-2">Equipment</h2>
      {EQUIPMENT_CATEGORIES.map((category) => {
        const categoryItems = items.filter((i) => i.category === category && i.status !== 'retired')
        if (categoryItems.length === 0) return null
        return (
          <div key={category} className="mb-3">
            <h3 className="font-medium">{CATEGORY_LABELS[category]}</h3>
            <ul>
              {categoryItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span
                    data-testid={`status-${item.id}`}
                    className={item.status === 'in_service' ? 'text-green-600' : 'text-red-600'}
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
                    className="text-xs underline disabled:opacity-50"
                  >
                    Toggle
                  </button>
                  <button
                    disabled={!updatedBy}
                    onClick={async () => {
                      await retireItem(item, updatedBy)
                      onChanged()
                    }}
                    className="text-xs text-red-600 underline disabled:opacity-50"
                  >
                    Retire
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
```

`src/components/AddEquipmentForm.tsx`:
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <label className="flex flex-col text-sm">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="flex flex-col text-sm">
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value as EquipmentCategory)}>
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
        className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        Add equipment
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/equipmentLabels.test.ts src/components/EquipmentSection.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/equipmentLabels.ts src/lib/equipmentLabels.test.ts src/components/EquipmentSection.tsx src/components/EquipmentSection.test.tsx src/components/AddEquipmentForm.tsx
git commit -m "Add equipment status display and management UI"
```

---

### Task 17: ProblemsBanner + NewProblemForm

**Files:**
- Create: `src/components/ProblemsBanner.tsx`
- Create: `src/components/NewProblemForm.tsx`
- Test: `src/components/ProblemsBanner.test.tsx`

**Interfaces:**
- Consumes: `formatFootnote` (Task 4); `LogEntry` (Task 2); `POST /api/logs` (Task 12).
- Produces: `ProblemsBanner({ latestProblem }): JSX.Element`, `NewProblemForm({ updatedBy, onAdded }): JSX.Element` — used by the dashboard page (Task 19) and log page (Task 18).

- [ ] **Step 1: Write the failing test**

`src/components/ProblemsBanner.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProblemsBanner } from './ProblemsBanner'
import type { LogEntry } from '@/lib/types'

describe('ProblemsBanner', () => {
  it('shows a placeholder when there are no open problems', () => {
    render(<ProblemsBanner latestProblem={null} />)
    expect(screen.getByText('No open problems.')).toBeInTheDocument()
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ProblemsBanner.test.tsx`
Expected: FAIL — `Cannot find module './ProblemsBanner'`.

- [ ] **Step 3: Write the implementation**

`src/components/ProblemsBanner.tsx`:
```tsx
import { formatFootnote } from '@/lib/formatFootnote'
import type { LogEntry } from '@/lib/types'

export function ProblemsBanner({ latestProblem }: { latestProblem: LogEntry | null }) {
  if (!latestProblem) {
    return <section className="text-sm text-gray-500">No open problems.</section>
  }

  return (
    <section className="border-l-4 border-red-500 pl-3">
      <div>{latestProblem.description}</div>
      <div className="text-xs text-gray-500">{formatFootnote(latestProblem)}</div>
    </section>
  )
}
```

`src/components/NewProblemForm.tsx`:
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ProblemsBanner.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProblemsBanner.tsx src/components/ProblemsBanner.test.tsx src/components/NewProblemForm.tsx
git commit -m "Add problems banner and new-problem form"
```

---

### Task 18: Log page

**Files:**
- Create: `src/components/LogTable.tsx`
- Create: `src/app/log/page.tsx`
- Test: `src/components/LogTable.test.tsx`
- Test: `src/app/log/page.test.tsx`

**Interfaces:**
- Consumes: `LogEntry` (Task 2); `NewProblemForm` (Task 17); `useLocalName` (Task 14); `useRealtimeRefetch` (Task 13); `getSupabaseClient` (Task 9); `GET /api/logs`, `PATCH /api/logs/:id` (Task 12).
- Produces: the `/log` route, and `LogTable({ entries, onResolve }): JSX.Element`.

- [ ] **Step 1: Write the failing tests**

`src/components/LogTable.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LogTable } from './LogTable'
import type { LogEntry } from '@/lib/types'

const entries: LogEntry[] = [
  {
    id: '1',
    createdAt: '2026-07-30T18:00:00.000Z',
    createdBy: 'J. Smith',
    entryType: 'problem_note',
    description: 'Decon pump leaking',
    resolved: false,
  },
  {
    id: '2',
    createdAt: '2026-07-29T18:00:00.000Z',
    createdBy: 'A. Lee',
    entryType: 'tank_update',
    description: 'Methane tank PSI updated from 2200 to 1800',
    resolved: null,
  },
]

describe('LogTable', () => {
  it('shows a resolve button only for unresolved problem notes', () => {
    render(<LogTable entries={entries} onResolve={vi.fn()} />)
    expect(screen.getAllByText('Mark resolved')).toHaveLength(1)
  })
})
```

`src/app/log/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LogPage from './page'

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

describe('LogPage', () => {
  it('renders the activity log heading', async () => {
    render(<LogPage />)
    expect(await screen.findByRole('heading', { name: /activity log/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/LogTable.test.tsx src/app/log/page.test.tsx`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write the implementation**

`src/components/LogTable.tsx`:
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
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th>When</th>
          <th>Who</th>
          <th>Type</th>
          <th>Description</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-b">
            <td>{new Date(entry.createdAt).toLocaleString()}</td>
            <td>{entry.createdBy}</td>
            <td>{entry.entryType}</td>
            <td>
              {entry.description}
              {entry.entryType === 'problem_note' && entry.resolved && (
                <span className="ml-2 text-xs text-green-600">(resolved)</span>
              )}
            </td>
            <td>
              {entry.entryType === 'problem_note' && !entry.resolved && (
                <button onClick={() => onResolve(entry.id)} className="text-xs underline">
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

`src/app/log/page.tsx`:
```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { LogTable } from '@/components/LogTable'
import { NewProblemForm } from '@/components/NewProblemForm'
import { useLocalName } from '@/hooks/useLocalName'
import { useRealtimeRefetch } from '@/hooks/useRealtimeRefetch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { LogEntry } from '@/lib/types'

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [name, setName] = useLocalName()

  const refetch = useCallback(async () => {
    const response = await fetch('/api/logs')
    setEntries(await response.json())
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeRefetch(getSupabaseClient(), 'log_entries', refetch)

  async function handleResolve(id: string) {
    await fetch(`/api/logs/${id}`, { method: 'PATCH' })
    refetch()
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Activity Log</h1>
      <label className="block mb-4 text-sm">
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} className="block border px-2 py-1" />
      </label>
      <div className="mb-6">
        <NewProblemForm updatedBy={name} onAdded={refetch} />
      </div>
      <LogTable entries={entries} onResolve={handleResolve} />
    </main>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/LogTable.test.tsx src/app/log/page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/LogTable.tsx src/components/LogTable.test.tsx src/app/log
git commit -m "Add activity log page"
```

---

### Task 19: Dashboard page assembly

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `TankSection` (Task 15), `EquipmentSection` (Task 16), `ProblemsBanner` (Task 17), `useLocalName` (Task 14), `useRealtimeRefetch` (Task 13), `getSupabaseClient` (Task 9), `GET /api/tanks` (Task 10), `GET /api/equipment` (Task 11), `GET /api/logs` (Task 12).
- Produces: the fully wired `/` dashboard route.

- [ ] **Step 1: Update the test to match real dashboard behavior**

Replace the contents of `src/app/page.test.tsx`:
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
  it('renders the dashboard heading and the cylinders section', async () => {
    render(<DashboardPage />)
    expect(
      await screen.findByRole('heading', { name: /hazmat inventory dashboard/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Cylinders')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/page.test.tsx`
Expected: FAIL — the placeholder `page.tsx` from Task 1 renders the heading but has no "Cylinders" section (that only exists inside `TankSection`, which the placeholder doesn't render yet), so `screen.getByText('Cylinders')` throws.

- [ ] **Step 3: Replace the placeholder dashboard page**

`src/app/page.tsx`:
```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
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
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">HAZMAT Inventory Dashboard</h1>
      <label className="block text-sm">
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} className="block border px-2 py-1" />
      </label>
      <ProblemsBanner latestProblem={latestProblem} />
      <TankSection tanks={tanks} updatedBy={name} onChanged={refetchTanks} />
      <EquipmentSection items={equipment} updatedBy={name} onChanged={refetchEquipment} />
      <a href="/log" className="text-sm underline">
        View full activity log →
      </a>
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/page.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Confirm the build compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "Wire up the dashboard page with live tanks, equipment, and problems"
```

---

### Task 20: Deployment — Supabase, Vercel, and manual end-to-end verification

**Files:** none (infrastructure setup + manual verification; no code changes).

**Interfaces:** none — this task wires the already-built app to real, publicly hosted infrastructure.

- [ ] **Step 1: Create the Supabase project**

Go to supabase.com, sign in, create a new free-tier project named `hazmat-inventory-dashboard`. Wait for provisioning to finish.

- [ ] **Step 2: Run the schema migration**

In the Supabase dashboard, open the SQL Editor, paste the full contents of `supabase/migrations/0001_init.sql`, and run it.
Expected: three tables (`tanks`, `equipment_items`, `log_entries`) appear under Table Editor, each with RLS enabled and a public policy.

- [ ] **Step 3: Collect API credentials**

In Supabase project Settings → API, copy the **Project URL** and the **anon public** key.

- [ ] **Step 4: Configure local environment**

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set:
```
NEXT_PUBLIC_SUPABASE_URL=<your project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
```

- [ ] **Step 5: Verify locally against the real database**

Run: `npm run dev`
Open `http://localhost:3000`. Expected: dashboard loads with "No open problems.", zero tanks, zero equipment. Use the "Add tank" and "Add equipment" forms (after typing a name) to add one of each; confirm they appear immediately.

- [ ] **Step 6: Push to GitHub**

```bash
git remote add origin <your empty GitHub repo URL, named "HAZMAT Tracker">
git push -u origin master
```

- [ ] **Step 7: Deploy to Vercel**

Go to vercel.com, sign in, "Add New Project", import the GitHub repo. In the project's Environment Variables settings, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same values as `.env.local`. Deploy.
Expected: Vercel gives a public URL (e.g. `hazmat-tracker.vercel.app`).

- [ ] **Step 8: Manual end-to-end verification**

Open the deployed URL in two separate browser tabs (simulating the wall display + a phone):
- In Tab A, type a name, add a tank with a PSI value, confirm it appears as a gauge.
- In Tab B (no manual refresh), confirm the same tank gauge appears within a couple seconds — this verifies Supabase Realtime is working end-to-end.
- In Tab A, update that tank's PSI lower — confirm the gauge color and value update live in Tab B.
- In Tab A, add an equipment item, then toggle its status — confirm Tab B's red/green indicator flips live.
- In Tab A, log a problem note — confirm it appears in the dashboard's Problems section with the correct "— name, date" footnote in both tabs, and that it appears on `/log`.
- On `/log`, mark that problem resolved — confirm the dashboard's Problems section falls back to "No open problems." (or the next-oldest open one) in both tabs, and the log entry shows "(resolved)" rather than disappearing.
- In Tab A, click "Retire" on the tank and on the equipment item you added — confirm both disappear from the dashboard's active lists in both tabs, while their earlier PSI/status-change log entries are still visible on `/log` (soft-delete: never actually removed from the database).

If every step above behaves as described, the implementation is complete.

---
