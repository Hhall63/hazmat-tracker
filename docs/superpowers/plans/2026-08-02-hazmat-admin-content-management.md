# Admin Content Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a passcode-gated `/admin` area that lets the HAZMAT team edit branding text, images, layout/Board, QR scan actions, and custom QR codes — all backed by a new Supabase settings store, with zero visual change until something is edited.

**Architecture:** Introduce a single-row `app_settings` table read through the existing repository → service → API-route → hook layering, with a typed `AppSettings` whose defaults equal today's hardcoded values. Components switch from literals to a `useAppSettings()` hook. A shared passcode (hashed, in a tightened-RLS `admin_config` table) gates `/admin/*` and `/api/admin/*` via Next.js middleware and an HMAC-signed cookie. Each capability is a small admin panel writing through a shared `useAdminSettings()` mutation hook.

**Tech Stack:** Next.js 14 (App Router, TS), Tailwind, Supabase (Postgres + Realtime + Storage), `qrcode`, vitest. Passcode hashing via Node built-in `crypto` (scrypt); session cookie via Web Crypto HMAC (works in Edge middleware). No new runtime dependencies.

## Global Constraints

- **Free tier only.** Vercel free + Supabase free (Storage ≤ 1 GB). No paid services, no new paid dependencies.
- **Zero visual regression before edits.** `DEFAULT_SETTINGS` values MUST equal the current hardcoded values, verbatim:
  - title: `HAZMAT Inventory`
  - subtitle: `Engine 11 · Ladder 21 · RRT 5` (note the `·` middot, U+00B7)
  - tabTitle: `HAZMAT Inventory Dashboard`
  - badgeImageUrl: `/gfd-badge.png`
  - emblemImageUrl: `/hazmat-emblem.png`
  - headings.cylinders: `Cylinders`
  - headings.equipment: `Equipment`
- **Commit directly to `master`** (solo project convention; no feature branches).
- **Tests:** vitest per-file, colocated next to source (e.g. `foo.test.ts` beside `foo.ts`). Full suite must stay green (baseline 133/133) plus new coverage. Test command: `npm test`.
- **Repository pattern:** every DB call goes through the `Repository` interface; add methods to the interface, `InMemoryRepository`, and `SupabaseRepository` together. Tests use `InMemoryRepository`, never real Supabase.
- **API routes are Node runtime** (default) — Node `crypto` is available. **Middleware is Edge runtime** — only Web Crypto is available there.
- **No secrets to the client.** `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_SESSION_SECRET` are server-only env vars.
- **Error handling:** every admin mutation checks `response.ok` and surfaces failure to the user (the app's prior silent-swallow bug class is banned).
- **Deploy note:** `git push` deploys to Preview only; production requires `vercel --prod` (Production Branch mismatch is a known, separate issue). Do not assume push = live.

## Model Assignment (token-conscious)

Each task carries a **Model:** line. Rationale:
- **Opus 4.8** — security-sensitive, cross-cutting, or architecture-defining tasks; the final whole-branch review.
- **Sonnet 5** — standard feature implementation and per-task reviews.
- **Haiku 4.5** — mechanical, low-judgement tasks (pure boilerplate, string/plumbing refactors, simple test scaffolds).
- **UI/UX:** for every task that creates or changes an admin screen, the implementer MUST invoke `/impeccable` and `/ui-ux-pro-max` (all features) and apply their output within the existing navy/gold design system (tokens in `tailwind.config.ts`). These tasks are marked **UI/UX skills: required.**

Per-task reviews (subagent-driven-development) default to **Sonnet 5**, except tasks marked **Review: Opus** (auth, uploads, middleware, final branch review).

---

## File Structure

**New files:**
- `src/lib/settings/types.ts` — `AppSettings`, sub-interfaces, `DEFAULT_SETTINGS`, `SECTION_KEYS`.
- `src/lib/settings/mergeSettings.ts` — merge stored partial over defaults.
- `src/lib/settings/settingsService.ts` — thin service over the repository.
- `src/lib/auth/passcode.ts` — `hashPasscode`, `verifyPasscode` (Node crypto).
- `src/lib/auth/session.ts` — `signSessionToken`, `verifySessionToken` (Web Crypto HMAC).
- `src/lib/supabaseAdminClient.ts` — service-role client (server-only).
- `src/hooks/useAppSettings.ts` — public read hook (realtime).
- `src/hooks/useAdminSettings.ts` — admin read+save hook.
- `src/app/api/settings/route.ts` — `GET` merged settings.
- `src/app/api/admin/settings/route.ts` — `PUT` settings (guarded).
- `src/app/api/admin/auth/route.ts` — `POST` verify passcode, set cookie.
- `src/app/api/admin/passcode/route.ts` — `PUT` change passcode.
- `src/app/api/admin/upload/route.ts` — `POST` image upload (Stage 2).
- `src/app/api/custom-qr/route.ts` + `src/app/api/custom-qr/[id]/route.ts` — custom QR CRUD (Stage 5).
- `src/middleware.ts` — guard `/admin/*` and `/api/admin/*`.
- `src/app/admin/login/page.tsx` — passcode entry.
- `src/app/admin/layout.tsx` + `src/app/admin/page.tsx` — admin shell + landing.
- `src/app/admin/branding/page.tsx` (Stage 1)
- `src/app/admin/images/page.tsx` (Stage 2)
- `src/app/admin/layout-board/page.tsx` (Stage 3)
- `src/app/admin/scan-actions/page.tsx` (Stage 4)
- `src/app/admin/qr/page.tsx` (Stage 5)
- `src/app/admin/passcode/page.tsx` (change passcode UI)
- `src/components/admin/*` — shared admin UI primitives (`AdminField`, `SaveBar`).
- `supabase/migrations/0002_app_settings.sql`, `0003_admin_config.sql`, `0004_custom_qr.sql`, plus a Storage bucket note.

**Modified files:**
- `src/lib/types.ts` — re-export settings types if convenient (optional).
- `src/lib/repository.ts` — add settings/admin/custom-qr methods to `Repository` + `InMemoryRepository`.
- `src/lib/supabaseRepository.ts` — implement the same methods + row mappers.
- `src/components/DashboardHeader.tsx` — consume settings.
- `src/app/layout.tsx` — dynamic tab title.
- `src/app/page.tsx`, `src/app/board/page.tsx`, `src/app/log/page.tsx` — consume settings; render sections from layout config (Stage 3).
- `src/app/scan/tank/[id]/page.tsx`, `src/app/scan/equipment/[id]/page.tsx` — respect scan-action config (Stage 4).
- `src/app/labels/page.tsx` — add custom QR + label appearance; relocate under `/admin` (Stage 5).

---

# STAGE 0 — Foundation

Delivers: settings store end-to-end, invisible refactor of hardcoded values, passcode auth, admin shell. After Stage 0 the site looks identical to today, but `/admin` exists and is gated.

## Task 0.1: Settings types and defaults

**Model:** Opus 4.8 · **Review:** Sonnet 5

**Files:**
- Create: `src/lib/settings/types.ts`
- Test: `src/lib/settings/types.test.ts`

**Interfaces:**
- Produces: `AppSettings`, `BrandingSettings`, `HeadingSettings`, `SectionConfig`, `LayoutSettings`, `BoardSettings`, `ScanActionSettings`, `TankActionFlags`, `EquipmentActionFlags`, `LabelSettings`, `DEFAULT_SETTINGS`, `SECTION_KEYS`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/settings/types.test.ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, SECTION_KEYS } from './types'

describe('DEFAULT_SETTINGS', () => {
  it('matches the current hardcoded values exactly', () => {
    expect(DEFAULT_SETTINGS.branding.title).toBe('HAZMAT Inventory')
    expect(DEFAULT_SETTINGS.branding.subtitle).toBe('Engine 11 · Ladder 21 · RRT 5')
    expect(DEFAULT_SETTINGS.branding.tabTitle).toBe('HAZMAT Inventory Dashboard')
    expect(DEFAULT_SETTINGS.branding.badgeImageUrl).toBe('/gfd-badge.png')
    expect(DEFAULT_SETTINGS.branding.emblemImageUrl).toBe('/hazmat-emblem.png')
    expect(DEFAULT_SETTINGS.headings.cylinders).toBe('Cylinders')
    expect(DEFAULT_SETTINGS.headings.equipment).toBe('Equipment')
  })

  it('defaults every section visible and in canonical order', () => {
    expect(DEFAULT_SETTINGS.layout.dashboard.map((s) => s.key)).toEqual(SECTION_KEYS)
    expect(DEFAULT_SETTINGS.layout.dashboard.every((s) => s.visible)).toBe(true)
    expect(DEFAULT_SETTINGS.layout.board.map((s) => s.key)).toEqual(SECTION_KEYS)
  })

  it('defaults all scan actions enabled and board density auto', () => {
    expect(DEFAULT_SETTINGS.scanActions.tankDefaults).toEqual({
      psi: true, status: true, logProblem: true, retire: true,
    })
    expect(DEFAULT_SETTINGS.scanActions.equipmentDefaults).toEqual({
      status: true, logProblem: true, retire: true,
    })
    expect(DEFAULT_SETTINGS.scanActions.overrides).toEqual({})
    expect(DEFAULT_SETTINGS.board.densityOverride).toBe('auto')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/settings/types.test.ts`
Expected: FAIL — cannot resolve `./types`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/settings/types.ts
export interface BrandingSettings {
  title: string
  subtitle: string
  tabTitle: string
  badgeImageUrl: string
  emblemImageUrl: string
}

export interface HeadingSettings {
  cylinders: string
  equipment: string
}

export interface SectionConfig {
  key: string
  visible: boolean
}

export const SECTION_KEYS = ['stats', 'problems', 'cylinders', 'equipment'] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

export interface LayoutSettings {
  dashboard: SectionConfig[]
  board: SectionConfig[]
}

export type BoardDensity = 'auto' | 'comfortable' | 'compact' | 'dense'
export interface BoardSettings {
  densityOverride: BoardDensity
}

export interface TankActionFlags {
  psi: boolean
  status: boolean
  logProblem: boolean
  retire: boolean
}

export interface EquipmentActionFlags {
  status: boolean
  logProblem: boolean
  retire: boolean
}

export type ActionFlags = TankActionFlags & EquipmentActionFlags

export interface ScanActionSettings {
  tankDefaults: TankActionFlags
  equipmentDefaults: EquipmentActionFlags
  overrides: Record<string, Partial<ActionFlags>>
}

export interface LabelSettings {
  size: 'small' | 'medium' | 'large'
  showLogo: boolean
  footerText: string
}

export interface AppSettings {
  branding: BrandingSettings
  headings: HeadingSettings
  layout: LayoutSettings
  board: BoardSettings
  scanActions: ScanActionSettings
  labels: LabelSettings
}

const allSectionsVisible = (): SectionConfig[] =>
  SECTION_KEYS.map((key) => ({ key, visible: true }))

export const DEFAULT_SETTINGS: AppSettings = {
  branding: {
    title: 'HAZMAT Inventory',
    subtitle: 'Engine 11 · Ladder 21 · RRT 5',
    tabTitle: 'HAZMAT Inventory Dashboard',
    badgeImageUrl: '/gfd-badge.png',
    emblemImageUrl: '/hazmat-emblem.png',
  },
  headings: {
    cylinders: 'Cylinders',
    equipment: 'Equipment',
  },
  layout: {
    dashboard: allSectionsVisible(),
    board: allSectionsVisible(),
  },
  board: {
    densityOverride: 'auto',
  },
  scanActions: {
    tankDefaults: { psi: true, status: true, logProblem: true, retire: true },
    equipmentDefaults: { status: true, logProblem: true, retire: true },
    overrides: {},
  },
  labels: {
    size: 'medium',
    showLogo: true,
    footerText: '',
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/settings/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings/types.ts src/lib/settings/types.test.ts
git commit -m "feat: add AppSettings types and defaults matching current hardcoded values"
```

## Task 0.2: mergeSettings

**Model:** Sonnet 5 · **Review:** Sonnet 5

**Files:**
- Create: `src/lib/settings/mergeSettings.ts`
- Test: `src/lib/settings/mergeSettings.test.ts`

**Interfaces:**
- Consumes: `AppSettings`, `DEFAULT_SETTINGS` from `./types`.
- Produces: `mergeSettings(stored: unknown): AppSettings`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/settings/mergeSettings.test.ts
import { describe, it, expect } from 'vitest'
import { mergeSettings } from './mergeSettings'
import { DEFAULT_SETTINGS } from './types'

describe('mergeSettings', () => {
  it('returns defaults for null, arrays, or non-objects', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings([])).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings('x')).toEqual(DEFAULT_SETTINGS)
  })

  it('overlays provided top-level sections over defaults', () => {
    const merged = mergeSettings({ branding: { title: 'Truck 21' } })
    expect(merged.branding.title).toBe('Truck 21')
    expect(merged.branding.subtitle).toBe(DEFAULT_SETTINGS.branding.subtitle)
    expect(merged.headings).toEqual(DEFAULT_SETTINGS.headings)
  })

  it('replaces array sections wholesale when provided', () => {
    const merged = mergeSettings({ layout: { dashboard: [{ key: 'stats', visible: false }] } })
    expect(merged.layout.dashboard).toEqual([{ key: 'stats', visible: false }])
    expect(merged.layout.board).toEqual(DEFAULT_SETTINGS.layout.board)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/settings/mergeSettings.test.ts`
Expected: FAIL — cannot resolve `./mergeSettings`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/settings/mergeSettings.ts
import { AppSettings, DEFAULT_SETTINGS } from './types'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Overlay a stored (possibly partial) config over DEFAULT_SETTINGS.
 *  Object sub-sections are shallow-merged; array/scalar sub-values are replaced. */
export function mergeSettings(stored: unknown): AppSettings {
  if (!isPlainObject(stored)) return structuredClone(DEFAULT_SETTINGS)
  const result = structuredClone(DEFAULT_SETTINGS)
  for (const key of Object.keys(result) as (keyof AppSettings)[]) {
    const incoming = (stored as Record<string, unknown>)[key]
    if (incoming === undefined) continue
    const base = result[key]
    if (isPlainObject(base) && isPlainObject(incoming)) {
      result[key] = { ...(base as object), ...(incoming as object) } as never
    } else {
      result[key] = incoming as never
    }
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/settings/mergeSettings.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings/mergeSettings.ts src/lib/settings/mergeSettings.test.ts
git commit -m "feat: add mergeSettings to overlay stored config over defaults"
```

## Task 0.3: Repository settings methods

**Model:** Sonnet 5 · **Review:** Sonnet 5

**Files:**
- Modify: `src/lib/repository.ts` (interface + `InMemoryRepository`)
- Modify: `src/lib/supabaseRepository.ts`
- Test: `src/lib/repository.test.ts` (append settings cases)

**Interfaces:**
- Produces (on `Repository`):
  - `getSettings(): Promise<unknown | null>` — raw stored `config` JSON or null.
  - `saveSettings(config: AppSettings, updatedBy: string): Promise<void>`.

- [ ] **Step 1: Write the failing test** (append to `src/lib/repository.test.ts`)

```ts
import { DEFAULT_SETTINGS } from './settings/types'

describe('InMemoryRepository settings', () => {
  it('returns null before anything is saved', async () => {
    const repo = new InMemoryRepository()
    expect(await repo.getSettings()).toBeNull()
  })

  it('round-trips saved settings', async () => {
    const repo = new InMemoryRepository()
    const next = { ...DEFAULT_SETTINGS, branding: { ...DEFAULT_SETTINGS.branding, title: 'X' } }
    await repo.saveSettings(next, 'Chief')
    expect(await repo.getSettings()).toEqual(next)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/repository.test.ts`
Expected: FAIL — `getSettings`/`saveSettings` not on `InMemoryRepository`.

- [ ] **Step 3: Add to the `Repository` interface** (`src/lib/repository.ts`, inside `export interface Repository { ... }`)

```ts
  getSettings(): Promise<unknown | null>
  saveSettings(config: AppSettings, updatedBy: string): Promise<void>
```

Add the import at the top of `src/lib/repository.ts`:

```ts
import type { AppSettings } from './settings/types'
```

- [ ] **Step 4: Implement on `InMemoryRepository`** (add field + methods)

```ts
  private settings: AppSettings | null = null

  async getSettings(): Promise<unknown | null> {
    return this.settings
  }

  async saveSettings(config: AppSettings, _updatedBy: string): Promise<void> {
    this.settings = config
  }
```

- [ ] **Step 5: Implement on `SupabaseRepository`** (`src/lib/supabaseRepository.ts`)

Add the import:

```ts
import type { AppSettings } from './settings/types'
```

Add methods to the class (single fixed-id row):

```ts
  async getSettings(): Promise<unknown | null> {
    const { data, error } = await this.client
      .from('app_settings')
      .select('config')
      .eq('id', 'singleton')
      .maybeSingle()
    if (error) throw error
    return data?.config ?? null
  }

  async saveSettings(config: AppSettings, updatedBy: string): Promise<void> {
    const { error } = await this.client
      .from('app_settings')
      .upsert({
        id: 'singleton',
        config,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      })
    if (error) throw error
  }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/lib/repository.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/repository.ts src/lib/supabaseRepository.ts src/lib/repository.test.ts
git commit -m "feat: add getSettings/saveSettings to repository"
```

## Task 0.4: app_settings migration

**Model:** Haiku 4.5 · **Review:** Sonnet 5

**Files:**
- Create: `supabase/migrations/0002_app_settings.sql`

**Interfaces:** none (SQL). This migration must be applied in the Supabase SQL editor before Stage 0 goes live.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_app_settings.sql
create table app_settings (
  id text primary key default 'singleton',
  config jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 'singleton')
);

alter table app_settings enable row level security;

-- Anyone may read settings (needed to render the app).
create policy "public read settings" on app_settings for select using (true);

-- Writes come only from server routes using the service-role key, which
-- bypasses RLS. No anon write policy is created, so anon cannot write.

alter publication supabase_realtime add table app_settings;
```

- [ ] **Step 2: Verify SQL parses** (local lint by eye; there is no local Postgres). Confirm: table has singleton constraint, RLS on, select policy present, no anon write policy, realtime added.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_app_settings.sql
git commit -m "feat: add app_settings table migration (public read, service-role write)"
```

## Task 0.5: settingsService

**Model:** Sonnet 5 · **Review:** Sonnet 5

**Files:**
- Create: `src/lib/settings/settingsService.ts`
- Test: `src/lib/settings/settingsService.test.ts`

**Interfaces:**
- Consumes: `Repository`, `mergeSettings`, `AppSettings`.
- Produces:
  - `getMergedSettings(repo: Repository): Promise<AppSettings>`
  - `saveMergedSettings(repo: Repository, incoming: unknown, updatedBy: string): Promise<AppSettings>` — merges incoming over defaults, persists the full merged object, returns it.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/settings/settingsService.test.ts
import { describe, it, expect } from 'vitest'
import { InMemoryRepository } from '../repository'
import { getMergedSettings, saveMergedSettings } from './settingsService'
import { DEFAULT_SETTINGS } from './types'

describe('settingsService', () => {
  it('returns defaults when nothing is stored', async () => {
    const repo = new InMemoryRepository()
    expect(await getMergedSettings(repo)).toEqual(DEFAULT_SETTINGS)
  })

  it('persists a full merged object and returns it', async () => {
    const repo = new InMemoryRepository()
    const saved = await saveMergedSettings(repo, { branding: { title: 'RRT 5' } }, 'Chief')
    expect(saved.branding.title).toBe('RRT 5')
    expect(saved.headings).toEqual(DEFAULT_SETTINGS.headings)
    // stored value is the full merged object, so later reads are complete
    expect(await getMergedSettings(repo)).toEqual(saved)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/settings/settingsService.test.ts`
Expected: FAIL — cannot resolve `./settingsService`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/settings/settingsService.ts
import type { Repository } from '../repository'
import { mergeSettings } from './mergeSettings'
import type { AppSettings } from './types'

export async function getMergedSettings(repo: Repository): Promise<AppSettings> {
  const stored = await repo.getSettings()
  return mergeSettings(stored)
}

export async function saveMergedSettings(
  repo: Repository,
  incoming: unknown,
  updatedBy: string
): Promise<AppSettings> {
  const current = await getMergedSettings(repo)
  const merged = mergeSettings({ ...current, ...(incoming as object) })
  await repo.saveSettings(merged, updatedBy)
  return merged
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/settings/settingsService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings/settingsService.ts src/lib/settings/settingsService.test.ts
git commit -m "feat: add settingsService (get merged / save merged)"
```

## Task 0.6: GET /api/settings

**Model:** Sonnet 5 · **Review:** Sonnet 5

**Files:**
- Create: `src/app/api/settings/route.ts`
- Test: `src/app/api/settings/route.test.ts`

**Interfaces:**
- Consumes: `getRepository`, `__setRepositoryForTests`, `getMergedSettings`.
- Produces: `GET` returning `AppSettings` JSON.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/settings/route.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { GET } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

afterEach(() => __setRepositoryForTests(null))

describe('GET /api/settings', () => {
  it('returns default settings when nothing stored', async () => {
    __setRepositoryForTests(new InMemoryRepository())
    const res = await GET()
    expect(await res.json()).toEqual(DEFAULT_SETTINGS)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/settings/route.test.ts`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/api/settings/route.ts
import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'
import { getMergedSettings } from '@/lib/settings/settingsService'

export async function GET() {
  const repo = getRepository()
  const settings = await getMergedSettings(repo)
  return NextResponse.json(settings)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/settings/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/settings/route.ts src/app/api/settings/route.test.ts
git commit -m "feat: add GET /api/settings"
```

## Task 0.7: useAppSettings hook

**Model:** Sonnet 5 · **Review:** Sonnet 5

**Files:**
- Create: `src/hooks/useAppSettings.ts`
- Test: `src/hooks/useAppSettings.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_SETTINGS`, `AppSettings`, `getSupabaseClient`, `useRealtimeRefetch`.
- Produces: `useAppSettings(): AppSettings` — initialized to `DEFAULT_SETTINGS`, fetches `/api/settings`, live-refetches on `app_settings` changes.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useAppSettings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAppSettings } from './useAppSettings'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  }),
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...DEFAULT_SETTINGS, branding: { ...DEFAULT_SETTINGS.branding, title: 'Truck 21' } }),
    })
  )
})

describe('useAppSettings', () => {
  it('starts with defaults then loads fetched settings', async () => {
    const { result } = renderHook(() => useAppSettings())
    expect(result.current.branding.title).toBe('HAZMAT Inventory')
    await waitFor(() => expect(result.current.branding.title).toBe('Truck 21'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useAppSettings.test.ts`
Expected: FAIL — cannot resolve `./useAppSettings`.

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useAppSettings.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useRealtimeRefetch } from './useRealtimeRefetch'
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/settings/types'

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) return
      setSettings(await res.json())
    } catch {
      // keep last-known/defaults on failure
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const client = getSupabaseClient()
  useRealtimeRefetch(client, 'app_settings', refetch)

  return settings
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useAppSettings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAppSettings.ts src/hooks/useAppSettings.test.ts
git commit -m "feat: add useAppSettings hook with realtime refetch"
```

## Task 0.8: DashboardHeader consumes settings

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required** (verify no visual change)

**Files:**
- Modify: `src/components/DashboardHeader.tsx`
- Modify/Create: `src/components/DashboardHeader.test.tsx`

**Interfaces:**
- Consumes: `useAppSettings`.
- Produces: `DashboardHeader` renders `settings.branding.title`, `settings.branding.badgeImageUrl`; `subtitle` prop still optional and, when omitted, falls back to `settings.branding.subtitle`.

Design note: today the three pages pass `subtitle="Engine 11 · Ladder 21 · RRT 5"` explicitly. To make the subtitle a single source of truth, the header defaults to `settings.branding.subtitle` when no `subtitle` prop is given. In Task 0.9 the three pages drop the hardcoded prop.

- [ ] **Step 1: Write/adjust the failing test**

```tsx
// src/components/DashboardHeader.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardHeader } from './DashboardHeader'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    ...DEFAULT_SETTINGS,
    branding: { ...DEFAULT_SETTINGS.branding, title: 'HAZMAT Inventory', subtitle: 'Sub Default' },
  }),
}))

describe('DashboardHeader', () => {
  it('renders the settings title and badge', () => {
    render(<DashboardHeader />)
    expect(screen.getByRole('heading', { name: /hazmat inventory/i })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('src', '/gfd-badge.png')
  })

  it('uses the settings subtitle when no prop is given', () => {
    render(<DashboardHeader />)
    expect(screen.getByText('Sub Default')).toBeInTheDocument()
  })

  it('prefers an explicit subtitle prop', () => {
    render(<DashboardHeader subtitle="Explicit" />)
    expect(screen.getByText('Explicit')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/DashboardHeader.test.tsx`
Expected: FAIL — header still uses hardcoded title.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/DashboardHeader.tsx
'use client'

import { useAppSettings } from '@/hooks/useAppSettings'

export function DashboardHeader({ subtitle }: { subtitle?: string }) {
  const settings = useAppSettings()
  const shownSubtitle = subtitle ?? settings.branding.subtitle
  return (
    <header className="flex items-center gap-3 border-b-2 border-gold bg-gradient-to-b from-panel to-bg px-5 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={settings.branding.badgeImageUrl}
        alt="Greensboro Fire Department badge"
        className="h-10 w-auto"
      />
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wide text-gold-bright">
          {settings.branding.title}
        </h1>
        {shownSubtitle && <p className="text-[11px] text-ink-dim">{shownSubtitle}</p>}
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/DashboardHeader.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/DashboardHeader.tsx src/components/DashboardHeader.test.tsx
git commit -m "feat: DashboardHeader reads branding from settings"
```

## Task 0.9: Pages consume settings (subtitle + section headings)

**Model:** Haiku 4.5 · **Review:** Sonnet 5 · **UI/UX skills: required** (verify no visual change)

**Files:**
- Modify: `src/app/page.tsx` — drop the hardcoded `subtitle` prop (header now supplies it).
- Modify: `src/app/log/page.tsx` — drop the hardcoded `subtitle` prop.
- Modify: `src/app/board/page.tsx` — drop the hardcoded `subtitle` prop; render section headings from `useAppSettings().headings`.
- Modify: `src/app/board/page.test.tsx`, `src/app/log/page.test.tsx` if they assert the subtitle string.

**Interfaces:** consumes `useAppSettings` (already added).

- [ ] **Step 1: Update board headings test**

```tsx
// add to src/app/board/page.test.tsx (or adjust existing render assertions)
// Ensure the mock for useAppSettings (or /api/settings fetch) yields DEFAULT_SETTINGS,
// then assert the headings still render:
expect(await screen.findByText('Cylinders')).toBeInTheDocument()
expect(screen.getByText('Equipment')).toBeInTheDocument()
```

Add this mock near the top of `src/app/board/page.test.tsx` if not already present:

```tsx
import { DEFAULT_SETTINGS } from '@/lib/settings/types'
vi.mock('@/hooks/useAppSettings', () => ({ useAppSettings: () => DEFAULT_SETTINGS }))
```

- [ ] **Step 2: Run tests to verify current state**

Run: `npm test -- src/app/board/page.test.tsx`
Expected: PASS currently (headings hardcoded) — this guards against regression.

- [ ] **Step 3: Edit `src/app/board/page.tsx`**

Add near the top of the component body:

```tsx
  const settings = useAppSettings()
```

Add the import:

```tsx
import { useAppSettings } from '@/hooks/useAppSettings'
```

Change the header line from:

```tsx
        <DashboardHeader subtitle="Engine 11 · Ladder 21 · RRT 5" />
```

to:

```tsx
        <DashboardHeader />
```

Change the two section headings from the literals `Cylinders` / `Equipment` to:

```tsx
            <h2 className="mb-2 text-xs uppercase tracking-wide text-gold">{settings.headings.cylinders}</h2>
```

```tsx
            <h2 className="mb-2 text-xs uppercase tracking-wide text-gold">{settings.headings.equipment}</h2>
```

- [ ] **Step 4: Edit `src/app/page.tsx` and `src/app/log/page.tsx`**

In each, change `<DashboardHeader subtitle="Engine 11 · Ladder 21 · RRT 5" />` to `<DashboardHeader />`.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS (baseline count + new tests). If `page.test.tsx`/`log/page.test.tsx` stub fetch to `[]`, the header falls back to `DEFAULT_SETTINGS.branding.subtitle` — assertions about the subtitle string, if any, still hold.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/log/page.tsx src/app/board/page.tsx src/app/board/page.test.tsx
git commit -m "feat: pages read subtitle and section headings from settings"
```

## Task 0.10: Dynamic tab title

**Model:** Haiku 4.5 · **Review:** Sonnet 5

**Files:**
- Modify: `src/app/layout.tsx`
- Test: `src/app/layout.test.tsx`

**Interfaces:** consumes `getMergedSettings` + `getRepository` in a server `generateMetadata`.

Design note: `layout.tsx` is a server component; it can read settings server-side via the repository and emit the tab title dynamically, without turning the layout into a client component. Also fixes the existing `themeColor` deprecation by moving it to a `viewport` export.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/layout.test.tsx
import { describe, it, expect, afterEach } from 'vitest'
import { generateMetadata } from './layout'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

afterEach(() => __setRepositoryForTests(null))

describe('generateMetadata', () => {
  it('uses the settings tab title', async () => {
    const repo = new InMemoryRepository()
    await repo.saveSettings(
      // minimal: rely on merge to fill the rest
      (await import('@/lib/settings/types')).DEFAULT_SETTINGS,
      'seed'
    )
    __setRepositoryForTests(repo)
    const meta = await generateMetadata()
    expect(meta.title).toBe('HAZMAT Inventory Dashboard')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/layout.test.tsx`
Expected: FAIL — `generateMetadata` not exported.

- [ ] **Step 3: Edit `src/app/layout.tsx`**

```tsx
import './globals.css'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import { getRepository } from '@/lib/repositoryFactory'
import { getMergedSettings } from '@/lib/settings/settingsService'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getMergedSettings(getRepository())
  return {
    title: settings.branding.tabTitle,
    manifest: '/manifest.json',
  }
}

export const viewport: Viewport = {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/layout.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/layout.test.tsx
git commit -m "feat: dynamic tab title from settings; move themeColor to viewport export"
```

---

### Auth sub-stage (Tasks 0.11–0.17)

## Task 0.11: passcode hashing util

**Model:** Opus 4.8 · **Review:** Opus

**Files:**
- Create: `src/lib/auth/passcode.ts`
- Test: `src/lib/auth/passcode.test.ts`

**Interfaces:**
- Produces: `hashPasscode(passcode: string): string` (returns `salt:hash` hex), `verifyPasscode(passcode: string, stored: string): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/auth/passcode.test.ts
import { describe, it, expect } from 'vitest'
import { hashPasscode, verifyPasscode } from './passcode'

describe('passcode hashing', () => {
  it('verifies a correct passcode', () => {
    const stored = hashPasscode('redtruck7')
    expect(verifyPasscode('redtruck7', stored)).toBe(true)
  })

  it('rejects an incorrect passcode', () => {
    const stored = hashPasscode('redtruck7')
    expect(verifyPasscode('wrong', stored)).toBe(false)
  })

  it('produces a different salt each time', () => {
    expect(hashPasscode('same')).not.toBe(hashPasscode('same'))
  })

  it('returns false for malformed stored values', () => {
    expect(verifyPasscode('x', 'not-a-valid-format')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/auth/passcode.test.ts`
Expected: FAIL — cannot resolve `./passcode`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/auth/passcode.ts
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEYLEN = 64

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(passcode, salt, KEYLEN).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPasscode(passcode: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(passcode, salt, KEYLEN)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/auth/passcode.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/passcode.ts src/lib/auth/passcode.test.ts
git commit -m "feat: add scrypt passcode hashing/verification"
```

## Task 0.12: session token util (Web Crypto HMAC)

**Model:** Opus 4.8 · **Review:** Opus

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session.test.ts`

**Interfaces:**
- Produces:
  - `signSessionToken(secret: string, issuedAtMs: number): Promise<string>` — `payloadB64.sigB64`.
  - `verifySessionToken(token: string, secret: string, nowMs: number, maxAgeMs?: number): Promise<boolean>`.

Design note: uses `globalThis.crypto.subtle` (available in Node 18+ and Edge), so the same code verifies the cookie inside Edge middleware. Time is passed in (never `Date.now()` internally) so tests are deterministic.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/auth/session.test.ts
import { describe, it, expect } from 'vitest'
import { signSessionToken, verifySessionToken } from './session'

const SECRET = 'test-secret'

describe('session tokens', () => {
  it('verifies a freshly signed token', async () => {
    const t = await signSessionToken(SECRET, 1000)
    expect(await verifySessionToken(t, SECRET, 2000)).toBe(true)
  })

  it('rejects a token signed with a different secret', async () => {
    const t = await signSessionToken(SECRET, 1000)
    expect(await verifySessionToken(t, 'other', 2000)).toBe(false)
  })

  it('rejects a tampered payload', async () => {
    const t = await signSessionToken(SECRET, 1000)
    const [, sig] = t.split('.')
    expect(await verifySessionToken(`AAAA.${sig}`, SECRET, 2000)).toBe(false)
  })

  it('rejects an expired token when maxAge is given', async () => {
    const t = await signSessionToken(SECRET, 1000)
    expect(await verifySessionToken(t, SECRET, 1000 + 10, 5)).toBe(false)
  })

  it('rejects malformed tokens', async () => {
    expect(await verifySessionToken('garbage', SECRET, 2000)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/auth/session.test.ts`
Expected: FAIL — cannot resolve `./session`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/auth/session.ts
const enc = new TextEncoder()

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64url(sig)
}

export async function signSessionToken(secret: string, issuedAtMs: number): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ iat: issuedAtMs })))
  const sig = await hmac(secret, payload)
  return `${payload}.${sig}`
}

export async function verifySessionToken(
  token: string,
  secret: string,
  nowMs: number,
  maxAgeMs?: number
): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  const expected = await hmac(secret, payload)
  if (sig !== expected) return false
  if (maxAgeMs !== undefined) {
    try {
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      if (typeof json.iat !== 'number' || nowMs - json.iat > maxAgeMs) return false
    } catch {
      return false
    }
  }
  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/auth/session.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts
git commit -m "feat: add HMAC session token sign/verify (Web Crypto)"
```

## Task 0.13: admin_config migration + repo methods + service-role client

**Model:** Opus 4.8 · **Review:** Opus

**Files:**
- Create: `supabase/migrations/0003_admin_config.sql`
- Create: `src/lib/supabaseAdminClient.ts`
- Modify: `src/lib/repository.ts` (interface + `InMemoryRepository`)
- Modify: `src/lib/supabaseRepository.ts`
- Test: append to `src/lib/repository.test.ts`

**Interfaces:**
- Produces on `Repository`:
  - `getAdminPasscodeHash(): Promise<string | null>`
  - `setAdminPasscodeHash(hash: string): Promise<void>`
- Produces: `getSupabaseAdminClient(): SupabaseClient` (service-role, server-only).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0003_admin_config.sql
create table admin_config (
  id text primary key default 'singleton',
  passcode_hash text,
  updated_at timestamptz not null default now(),
  constraint admin_config_singleton check (id = 'singleton')
);

-- Tightened RLS: no anon policies at all. Only the service-role key
-- (used exclusively by server admin routes) can read or write.
alter table admin_config enable row level security;

insert into admin_config (id, passcode_hash) values ('singleton', null);
```

- [ ] **Step 2: Write the failing repo test** (append to `src/lib/repository.test.ts`)

```ts
describe('InMemoryRepository admin config', () => {
  it('returns null hash by default and round-trips a set hash', async () => {
    const repo = new InMemoryRepository()
    expect(await repo.getAdminPasscodeHash()).toBeNull()
    await repo.setAdminPasscodeHash('salt:hash')
    expect(await repo.getAdminPasscodeHash()).toBe('salt:hash')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/repository.test.ts`
Expected: FAIL — methods missing.

- [ ] **Step 4: Add to `Repository` interface + `InMemoryRepository`**

Interface (in `src/lib/repository.ts`):

```ts
  getAdminPasscodeHash(): Promise<string | null>
  setAdminPasscodeHash(hash: string): Promise<void>
```

InMemory:

```ts
  private adminPasscodeHash: string | null = null

  async getAdminPasscodeHash(): Promise<string | null> {
    return this.adminPasscodeHash
  }

  async setAdminPasscodeHash(hash: string): Promise<void> {
    this.adminPasscodeHash = hash
  }
```

- [ ] **Step 5: Implement service-role client**

```ts
// src/lib/supabaseAdminClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

/** Server-only. Uses the service-role key, which bypasses RLS.
 *  Never import this into a client component. */
export function getSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  cached = createClient(url, serviceKey, { auth: { persistSession: false } })
  return cached
}
```

- [ ] **Step 6: Implement on `SupabaseRepository`**

```ts
  async getAdminPasscodeHash(): Promise<string | null> {
    const { data, error } = await this.client
      .from('admin_config')
      .select('passcode_hash')
      .eq('id', 'singleton')
      .maybeSingle()
    if (error) throw error
    return data?.passcode_hash ?? null
  }

  async setAdminPasscodeHash(hash: string): Promise<void> {
    const { error } = await this.client
      .from('admin_config')
      .upsert({ id: 'singleton', passcode_hash: hash, updated_at: new Date().toISOString() })
    if (error) throw error
  }
```

Note: routes that write admin config must construct `new SupabaseRepository(getSupabaseAdminClient())` so writes use the service-role key. The default `getRepository()` (anon) can read settings but must not be used for admin_config writes.

- [ ] **Step 7: Run tests**

Run: `npm test -- src/lib/repository.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0003_admin_config.sql src/lib/supabaseAdminClient.ts src/lib/repository.ts src/lib/supabaseRepository.ts src/lib/repository.test.ts
git commit -m "feat: add admin_config table, service-role client, passcode hash repo methods"
```

## Task 0.14: POST /api/admin/auth

**Model:** Opus 4.8 · **Review:** Opus

**Files:**
- Create: `src/app/api/admin/auth/route.ts`
- Test: `src/app/api/admin/auth/route.test.ts`

**Interfaces:**
- Consumes: `verifyPasscode`, `signSessionToken`, an admin repository, `ADMIN_SESSION_SECRET`.
- Produces: `POST` — body `{ passcode }`; on success sets cookie `hazmat_admin` and returns `{ ok: true }`; on failure returns 401.

Design note: to keep the route testable without a live service-role DB, the route resolves its repository via `getRepository()` when a test override is set, else `new SupabaseRepository(getSupabaseAdminClient())`. Add a small helper `getAdminRepository()` in `repositoryFactory.ts` that returns the test override if present, otherwise the service-role-backed repo.

- [ ] **Step 1: Add `getAdminRepository` to `src/lib/repositoryFactory.ts`**

```ts
import { getSupabaseAdminClient } from './supabaseAdminClient'

export function getAdminRepository(): Repository {
  if (testOverride) return testOverride
  return new SupabaseRepository(getSupabaseAdminClient())
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/app/api/admin/auth/route.test.ts
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { hashPasscode } from '@/lib/auth/passcode'

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
})
afterEach(() => __setRepositoryForTests(null))

function req(body: unknown) {
  return new Request('http://localhost/api/admin/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/auth', () => {
  it('sets a cookie for the correct passcode', async () => {
    const repo = new InMemoryRepository()
    await repo.setAdminPasscodeHash(hashPasscode('open-sesame'))
    __setRepositoryForTests(repo)
    const res = await POST(req({ passcode: 'open-sesame' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('hazmat_admin=')
  })

  it('rejects a wrong passcode with 401 and no cookie', async () => {
    const repo = new InMemoryRepository()
    await repo.setAdminPasscodeHash(hashPasscode('open-sesame'))
    __setRepositoryForTests(repo)
    const res = await POST(req({ passcode: 'nope' }))
    expect(res.status).toBe(401)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('rejects when no passcode has been configured', async () => {
    __setRepositoryForTests(new InMemoryRepository())
    const res = await POST(req({ passcode: 'anything' }))
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/app/api/admin/auth/route.test.ts`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 4: Write the implementation**

```ts
// src/app/api/admin/auth/route.ts
import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'
import { verifyPasscode } from '@/lib/auth/passcode'
import { signSessionToken } from '@/lib/auth/session'

export const ADMIN_COOKIE = 'hazmat_admin'
const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function POST(request: Request) {
  const { passcode } = (await request.json()) as { passcode?: string }
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return NextResponse.json({ error: 'server not configured' }, { status: 500 })
  if (!passcode) return NextResponse.json({ error: 'passcode required' }, { status: 400 })

  const repo = getAdminRepository()
  const stored = await repo.getAdminPasscodeHash()
  if (!stored || !verifyPasscode(passcode, stored)) {
    return NextResponse.json({ error: 'invalid passcode' }, { status: 401 })
  }

  const token = await signSessionToken(secret, Date.now())
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  })
  return res
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/app/api/admin/auth/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/auth/route.ts src/app/api/admin/auth/route.test.ts src/lib/repositoryFactory.ts
git commit -m "feat: add POST /api/admin/auth with signed cookie"
```

## Task 0.15: middleware guard

**Model:** Opus 4.8 · **Review:** Opus

**Files:**
- Create: `src/middleware.ts`
- Test: `src/middleware.test.ts`

**Interfaces:**
- Consumes: `verifySessionToken`, `ADMIN_SESSION_SECRET`, cookie `hazmat_admin`.
- Produces: `middleware(request)` + `config.matcher` covering `/admin/:path*` and `/api/admin/:path*`, excluding `/admin/login` and `/api/admin/auth`.

Design note: unauthenticated `/admin/*` page requests redirect to `/admin/login`; unauthenticated `/api/admin/*` requests return 401 JSON. `/admin/login` and `/api/admin/auth` are always allowed (else you could never log in).

- [ ] **Step 1: Write the failing test**

```ts
// src/middleware.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'
import { signSessionToken } from '@/lib/auth/session'

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
})

function get(path: string, cookie?: string) {
  const url = `http://localhost${path}`
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  return new NextRequest(url, { headers })
}

describe('admin middleware', () => {
  it('redirects unauthenticated /admin to /admin/login', async () => {
    const res = await middleware(get('/admin/branding'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin/login')
  })

  it('401s unauthenticated /api/admin requests', async () => {
    const res = await middleware(get('/api/admin/settings'))
    expect(res.status).toBe(401)
  })

  it('allows /admin/login through', async () => {
    const res = await middleware(get('/admin/login'))
    expect(res.status).toBe(200) // NextResponse.next()
  })

  it('allows an authenticated request through', async () => {
    const token = await signSessionToken('test-secret', Date.now())
    const res = await middleware(get('/admin/branding', `hazmat_admin=${token}`))
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/middleware.test.ts`
Expected: FAIL — cannot resolve `./middleware`.

- [ ] **Step 3: Write the implementation**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/auth/session'

const ALWAYS_ALLOW = ['/admin/login', '/api/admin/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (ALWAYS_ALLOW.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const secret = process.env.ADMIN_SESSION_SECRET ?? ''
  const token = request.cookies.get('hazmat_admin')?.value
  const ok = token ? await verifySessionToken(token, secret, Date.now()) : false
  if (ok) return NextResponse.next()

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/admin/login'
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/middleware.test.ts`
Expected: PASS (4 tests). Note: `NextResponse.next()` yields status 200 in tests.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts
git commit -m "feat: add middleware guarding /admin and /api/admin"
```

## Task 0.16: PUT /api/admin/settings + PUT /api/admin/passcode

**Model:** Opus 4.8 · **Review:** Opus

**Files:**
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/app/api/admin/passcode/route.ts`
- Test: `src/app/api/admin/settings/route.test.ts`, `src/app/api/admin/passcode/route.test.ts`

**Interfaces:**
- `PUT /api/admin/settings` — body = partial `AppSettings`; persists via `saveMergedSettings` using `getAdminRepository()`; returns merged `AppSettings`.
- `PUT /api/admin/passcode` — body `{ newPasscode }`; hashes and stores via `setAdminPasscodeHash`; returns `{ ok: true }`.

Note: these routes assume the middleware already authenticated the request. They do not re-check the cookie (middleware is the gate).

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/api/admin/settings/route.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { PUT } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests, getRepository } from '@/lib/repositoryFactory'

afterEach(() => __setRepositoryForTests(null))

function req(body: unknown) {
  return new Request('http://localhost/api/admin/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/admin/settings', () => {
  it('persists a partial update and returns merged settings', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const res = await PUT(req({ branding: { title: 'Engine 21' } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.branding.title).toBe('Engine 21')
    expect(await getRepository().getSettings()).not.toBeNull()
  })
})
```

```ts
// src/app/api/admin/passcode/route.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { PUT } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'
import { verifyPasscode } from '@/lib/auth/passcode'

afterEach(() => __setRepositoryForTests(null))

describe('PUT /api/admin/passcode', () => {
  it('stores a hash that verifies against the new passcode', async () => {
    const repo = new InMemoryRepository()
    __setRepositoryForTests(repo)
    const res = await PUT(
      new Request('http://localhost/api/admin/passcode', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPasscode: 'brand-new' }),
      })
    )
    expect(res.status).toBe(200)
    const stored = await repo.getAdminPasscodeHash()
    expect(stored && verifyPasscode('brand-new', stored)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/admin/settings/route.test.ts src/app/api/admin/passcode/route.test.ts`
Expected: FAIL — cannot resolve routes.

- [ ] **Step 3: Write the implementations**

```ts
// src/app/api/admin/settings/route.ts
import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'
import { saveMergedSettings } from '@/lib/settings/settingsService'

export async function PUT(request: Request) {
  const incoming = await request.json()
  const repo = getAdminRepository()
  const merged = await saveMergedSettings(repo, incoming, 'admin')
  return NextResponse.json(merged)
}
```

```ts
// src/app/api/admin/passcode/route.ts
import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'
import { hashPasscode } from '@/lib/auth/passcode'

export async function PUT(request: Request) {
  const { newPasscode } = (await request.json()) as { newPasscode?: string }
  if (!newPasscode || newPasscode.length < 4) {
    return NextResponse.json({ error: 'passcode must be at least 4 characters' }, { status: 400 })
  }
  const repo = getAdminRepository()
  await repo.setAdminPasscodeHash(hashPasscode(newPasscode))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/admin/settings/route.test.ts src/app/api/admin/passcode/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/settings/route.ts src/app/api/admin/passcode/route.ts src/app/api/admin/settings/route.test.ts src/app/api/admin/passcode/route.test.ts
git commit -m "feat: add guarded PUT /api/admin/settings and /api/admin/passcode"
```

## Task 0.17: admin shell + login + useAdminSettings

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required**

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/hooks/useAdminSettings.ts`
- Create: `src/components/admin/SaveBar.tsx`
- Test: `src/app/admin/login/page.test.tsx`, `src/hooks/useAdminSettings.test.ts`

**Interfaces:**
- Produces: `useAdminSettings(): { settings: AppSettings; setSettings: (s: AppSettings) => void; save: () => Promise<void>; saving: boolean; error: string; savedAt: number | null }`.
- Produces: `AdminLayout` with sidebar nav to `/admin/branding`, `/admin/images`, `/admin/layout-board`, `/admin/scan-actions`, `/admin/qr`, `/admin/passcode`. Later stages fill those routes.

UI/UX: invoke `/impeccable` and `/ui-ux-pro-max` (all features) for the shell, login, and SaveBar; match navy/gold tokens; sidebar collapses on mobile.

- [ ] **Step 1: Write the failing hook test**

```ts
// src/hooks/useAdminSettings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminSettings } from './useAdminSettings'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => DEFAULT_SETTINGS }) // initial GET
      .mockResolvedValueOnce({ ok: true, json: async () => DEFAULT_SETTINGS }) // PUT
  )
})

describe('useAdminSettings', () => {
  it('loads settings then saves via PUT', async () => {
    const { result } = renderHook(() => useAdminSettings())
    await waitFor(() => expect(result.current.settings.branding.title).toBe('HAZMAT Inventory'))
    await act(async () => {
      await result.current.save()
    })
    const putCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(putCall[0]).toBe('/api/admin/settings')
    expect(putCall[1].method).toBe('PUT')
  })

  it('surfaces an error when save fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => DEFAULT_SETTINGS })
      .mockResolvedValueOnce({ ok: false }))
    const { result } = renderHook(() => useAdminSettings())
    await waitFor(() => expect(result.current.settings).toBeTruthy())
    await act(async () => { await result.current.save() })
    expect(result.current.error).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useAdminSettings.test.ts`
Expected: FAIL — cannot resolve `./useAdminSettings`.

- [ ] **Step 3: Implement `useAdminSettings`**

```ts
// src/hooks/useAdminSettings.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/settings/types'

export function useAdminSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(async (r) => {
        if (r.ok) setSettings(await r.json())
      })
      .catch(() => {})
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('save failed')
      setSettings(await res.json())
      setSavedAt(Date.now())
    } catch {
      setError('Could not save — please try again.')
    } finally {
      setSaving(false)
    }
  }, [settings])

  return { settings, setSettings, save, saving, error, savedAt }
}
```

- [ ] **Step 4: Write the login page test**

```tsx
// src/app/admin/login/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from './page'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

beforeEach(() => {
  replace.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

describe('admin LoginPage', () => {
  it('posts the passcode and redirects on success', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/passcode/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /enter/i }))
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'))
  })

  it('shows an error on wrong passcode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/passcode/i), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /enter/i }))
    expect(await screen.findByText(/incorrect passcode/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run login test to verify it fails**

Run: `npm test -- src/app/admin/login/page.test.tsx`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 6: Implement login, layout, landing, SaveBar**

```tsx
// src/app/admin/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/DashboardHeader'

export default function LoginPage() {
  const router = useRouter()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      if (!res.ok) throw new Error('bad')
      router.replace('/admin')
    } catch {
      setError('Incorrect passcode.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader subtitle="Admin" />
      <main className="mx-auto max-w-sm space-y-4 p-6 text-ink">
        <h2 className="text-lg font-bold text-gold-bright">Admin access</h2>
        <label htmlFor="passcode" className="block text-sm text-ink-dim">
          Passcode
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink"
          />
        </label>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <button
          onClick={submit}
          disabled={submitting || !passcode}
          className="w-full rounded bg-gold px-4 py-3 font-bold text-bg disabled:opacity-50"
        >
          Enter
        </button>
      </main>
    </div>
  )
}
```

```tsx
// src/app/admin/layout.tsx
'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/DashboardHeader'

const NAV = [
  { href: '/admin/branding', label: 'Branding' },
  { href: '/admin/images', label: 'Images' },
  { href: '/admin/layout-board', label: 'Layout & Board' },
  { href: '/admin/scan-actions', label: 'Scan Actions' },
  { href: '/admin/qr', label: 'QR Codes' },
  { href: '/admin/passcode', label: 'Passcode' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DashboardHeader subtitle="Admin" />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:flex-row">
        <nav className="flex flex-wrap gap-2 md:w-48 md:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded border border-gold/20 bg-panel px-3 py-2 text-sm text-ink hover:border-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 text-ink">{children}</main>
      </div>
    </div>
  )
}
```

```tsx
// src/app/admin/page.tsx
export default function AdminHome() {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold text-gold-bright">Admin</h2>
      <p className="text-sm text-ink-dim">Choose a section from the menu to edit app content.</p>
    </div>
  )
}
```

```tsx
// src/components/admin/SaveBar.tsx
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
    <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-gold/20 bg-bg/90 py-3">
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded bg-gold px-4 py-2 font-bold text-bg disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      {error && <span className="text-sm text-status-red">{error}</span>}
      {!error && savedAt && <span className="text-sm text-status-green">Saved</span>}
    </div>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- src/hooks/useAdminSettings.test.ts src/app/admin/login/page.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin src/hooks/useAdminSettings.ts src/components/admin/SaveBar.tsx src/hooks/useAdminSettings.test.ts src/app/admin/login/page.test.tsx
git commit -m "feat: add admin shell, login page, useAdminSettings hook, SaveBar"
```

## Task 0.18: Stage 0 checkpoint — full suite + setup docs

**Model:** Opus 4.8 (review) · **Review:** Opus

**Files:**
- Create: `docs/admin-setup.md`

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: PASS (baseline 133 + all new tests).

- [ ] **Step 2: Run the production build to catch route/runtime issues**

Run: `npm run build`
Expected: build succeeds; no `themeColor`/metadata warning (moved to `viewport`).

- [ ] **Step 3: Write `docs/admin-setup.md`** documenting the one-time setup:

```md
# Admin setup (one-time)

1. Apply migrations `0002_app_settings.sql` and `0003_admin_config.sql` in the
   Supabase SQL editor.
2. Set env vars in Vercel (Production + Preview) and `.env.local`:
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings → API.
   - `ADMIN_SESSION_SECRET` — a long random string (e.g. `openssl rand -hex 32`).
3. Seed the first passcode: with the app running, POST to `/api/admin/passcode`
   once from a trusted device (temporarily, before deploying the middleware, or
   via the Supabase SQL editor by inserting a scrypt hash). Simplest: run the app
   locally, temporarily call the passcode route, then deploy.
4. Verify: visit `/admin` → redirected to `/admin/login` → enter passcode → reach `/admin`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/admin-setup.md
git commit -m "docs: admin one-time setup instructions; Stage 0 checkpoint"
```

---

# STAGE 1 — Branding text panel

Delivers: `/admin/branding` edits title, subtitle, tab title, and section headings live.

## Task 1.1: Branding panel

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required**

**Files:**
- Create: `src/app/admin/branding/page.tsx`
- Test: `src/app/admin/branding/page.test.tsx`

**Interfaces:** consumes `useAdminSettings`, `SaveBar`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/branding/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BrandingPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => DEFAULT_SETTINGS }) // GET
    .mockResolvedValue({ ok: true, json: async () => DEFAULT_SETTINGS }))    // PUT
})

describe('BrandingPage', () => {
  it('edits the title and saves', async () => {
    render(<BrandingPage />)
    const title = await screen.findByLabelText(/^title$/i)
    expect(title).toHaveValue('HAZMAT Inventory')
    fireEvent.change(title, { target: { value: 'Engine 21 HAZMAT' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(JSON.parse(put![1].body).branding.title).toBe('Engine 21 HAZMAT')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/branding/page.test.tsx`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/app/admin/branding/page.tsx
'use client'

import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'

export default function BrandingPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()

  const setBranding = (patch: Partial<typeof settings.branding>) =>
    setSettings({ ...settings, branding: { ...settings.branding, ...patch } })
  const setHeadings = (patch: Partial<typeof settings.headings>) =>
    setSettings({ ...settings, headings: { ...settings.headings, ...patch } })

  const field = 'mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink'

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gold-bright">Branding text</h2>

      <label className="block text-sm text-ink-dim">Title
        <input aria-label="Title" className={field} value={settings.branding.title}
          onChange={(e) => setBranding({ title: e.target.value })} />
      </label>
      <label className="block text-sm text-ink-dim">Subtitle
        <input aria-label="Subtitle" className={field} value={settings.branding.subtitle}
          onChange={(e) => setBranding({ subtitle: e.target.value })} />
      </label>
      <label className="block text-sm text-ink-dim">Browser tab title
        <input aria-label="Tab title" className={field} value={settings.branding.tabTitle}
          onChange={(e) => setBranding({ tabTitle: e.target.value })} />
      </label>
      <label className="block text-sm text-ink-dim">Cylinders heading
        <input aria-label="Cylinders heading" className={field} value={settings.headings.cylinders}
          onChange={(e) => setHeadings({ cylinders: e.target.value })} />
      </label>
      <label className="block text-sm text-ink-dim">Equipment heading
        <input aria-label="Equipment heading" className={field} value={settings.headings.equipment}
          onChange={(e) => setHeadings({ equipment: e.target.value })} />
      </label>

      <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/branding/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/branding
git commit -m "feat: add /admin/branding panel"
```

---

# STAGE 2 — Images (Supabase Storage)

Delivers: `/admin/images` uploads/swaps badge, emblem, and extra photos; URLs saved to settings.

## Task 2.1: Storage bucket + upload route

**Model:** Sonnet 5 · **Review:** Opus (upload security)

**Files:**
- Create: `supabase/migrations/0005_storage_branding.sql` (or documented dashboard step)
- Create: `src/app/api/admin/upload/route.ts`
- Test: `src/app/api/admin/upload/route.test.ts`

**Interfaces:**
- `POST /api/admin/upload` — multipart form with `file`; validates type ∈ {png,jpeg,webp,svg} and size ≤ 2 MB; uploads to bucket `branding` via service-role client; returns `{ url }` (public URL).

- [ ] **Step 1: Write the bucket setup SQL/doc**

```sql
-- supabase/migrations/0005_storage_branding.sql
-- Create a public-read bucket for branding images.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;
```

- [ ] **Step 2: Write the failing test** (validation-focused; upload client is injected/mocked)

```ts
// src/app/api/admin/upload/route.test.ts
import { describe, it, expect } from 'vitest'
import { validateUpload } from './route'

describe('validateUpload', () => {
  it('accepts a small png', () => {
    expect(validateUpload('image/png', 1000)).toBeNull()
  })
  it('rejects an unsupported type', () => {
    expect(validateUpload('application/pdf', 1000)).toMatch(/type/i)
  })
  it('rejects files over 2MB', () => {
    expect(validateUpload('image/png', 3_000_000)).toMatch(/large/i)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/app/api/admin/upload/route.test.ts`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 4: Write the implementation**

```ts
// src/app/api/admin/upload/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdminClient'

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_BYTES = 2 * 1024 * 1024

export function validateUpload(type: string, size: number): string | null {
  if (!ALLOWED.includes(type)) return 'Unsupported file type'
  if (size > MAX_BYTES) return 'File too large (max 2 MB)'
  return null
}

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  const problem = validateUpload(file.type, file.size)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const client = getSupabaseAdminClient()
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `uploads/${crypto.randomUUID()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await client.storage.from('branding').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = client.storage.from('branding').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/app/api/admin/upload/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0005_storage_branding.sql src/app/api/admin/upload/route.ts src/app/api/admin/upload/route.test.ts
git commit -m "feat: add image upload route + branding storage bucket"
```

## Task 2.2: Images panel

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required**

**Files:**
- Create: `src/app/admin/images/page.tsx`
- Create: `src/components/admin/ImageUploadField.tsx`
- Test: `src/app/admin/images/page.test.tsx`

**Interfaces:** consumes `useAdminSettings`, `SaveBar`; `ImageUploadField` posts to `/api/admin/upload` and calls back with the URL.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/images/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ImagesPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => DEFAULT_SETTINGS }))
})

describe('ImagesPage', () => {
  it('shows current badge and emblem previews', async () => {
    render(<ImagesPage />)
    const imgs = await screen.findAllByRole('img')
    const srcs = imgs.map((i) => i.getAttribute('src'))
    expect(srcs).toContain('/gfd-badge.png')
    expect(srcs).toContain('/hazmat-emblem.png')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/images/page.test.tsx`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Implement `ImageUploadField`**

```tsx
// src/components/admin/ImageUploadField.tsx
'use client'

import { useState } from 'react'

export function ImageUploadField({
  label,
  currentUrl,
  onUploaded,
}: {
  label: string
  currentUrl: string
  onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('upload failed')
      const { url } = await res.json()
      onUploaded(url)
    } catch {
      setError('Upload failed — check the file and try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-dim">{label}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={currentUrl} alt={label} className="h-16 w-auto rounded border border-gold/20 bg-panel p-1" />
      <input
        type="file"
        aria-label={`Upload ${label}`}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="block text-sm text-ink"
      />
      {uploading && <p className="text-sm text-ink-dim">Uploading…</p>}
      {error && <p className="text-sm text-status-red">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Implement the images page**

```tsx
// src/app/admin/images/page.tsx
'use client'

import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'
import { ImageUploadField } from '@/components/admin/ImageUploadField'

export default function ImagesPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()
  const setBranding = (patch: Partial<typeof settings.branding>) =>
    setSettings({ ...settings, branding: { ...settings.branding, ...patch } })

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gold-bright">Images</h2>
      <ImageUploadField
        label="Header badge"
        currentUrl={settings.branding.badgeImageUrl}
        onUploaded={(url) => setBranding({ badgeImageUrl: url })}
      />
      <ImageUploadField
        label="HAZMAT emblem"
        currentUrl={settings.branding.emblemImageUrl}
        onUploaded={(url) => setBranding({ emblemImageUrl: url })}
      />
      <p className="text-xs text-ink-dim">Uploads are capped at 2 MB (png, jpeg, webp, or svg). Remember to Save.</p>
      <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/app/admin/images/page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/images src/components/admin/ImageUploadField.tsx
git commit -m "feat: add /admin/images upload panel"
```

---

# STAGE 3 — Layout & Board

Delivers: reorder/show-hide sections on dashboard and Board; Board density override. Dashboard/Board render from `settings.layout` + `settings.board`.

## Task 3.1: Section rendering from layout config (dashboard)

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required** (verify parity)

**Files:**
- Modify: `src/app/page.tsx` — render sections in `settings.layout.dashboard` order, skipping `visible: false`.
- Modify: `src/app/page.test.tsx` if needed.

**Interfaces:** section keys are `SECTION_KEYS` = `['stats','problems','cylinders','equipment']`.

- [ ] **Step 1: Write the failing test** (hide equipment → not rendered)

```tsx
// add to src/app/page.test.tsx
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

it('omits sections marked not visible', async () => {
  const hidden = {
    ...DEFAULT_SETTINGS,
    layout: {
      ...DEFAULT_SETTINGS.layout,
      dashboard: DEFAULT_SETTINGS.layout.dashboard.map((s) =>
        s.key === 'equipment' ? { ...s, visible: false } : s
      ),
    },
  }
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) =>
    url === '/api/settings' ? { ok: true, json: async () => hidden } : { json: async () => [] }
  ))
  render(<DashboardPage />)
  await screen.findByTestId('stat-bar')
  expect(screen.queryByText('Equipment')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/page.test.tsx`
Expected: FAIL — equipment still rendered unconditionally.

- [ ] **Step 3: Refactor `src/app/page.tsx`**

Introduce a section map keyed by `SectionKey` and render in configured order. Add near the top of the component:

```tsx
  const settings = useAppSettings()
```

Replace the fixed section JSX (StatBar / ProblemsBanner / TankSection / EquipmentSection) with a config-driven render:

```tsx
  const sectionNodes: Record<string, JSX.Element> = {
    stats: <StatBar key="stats" tanks={tanks} equipment={equipment} logEntries={logEntries} />,
    problems: <ProblemsBanner key="problems" latestProblem={latestProblem} />,
    cylinders: <TankSection key="cylinders" tanks={tanks} updatedBy={name} onChanged={refetchTanks} />,
    equipment: <EquipmentSection key="equipment" items={equipment} updatedBy={name} onChanged={refetchEquipment} />,
  }
```

```tsx
        {settings.layout.dashboard
          .filter((s) => s.visible)
          .map((s) => sectionNodes[s.key])
          .filter(Boolean)}
```

Keep the existing two-column grid only for cylinders+equipment if both visible; to preserve the current look, wrap those two in the grid when present. (Reviewer verifies visual parity against `main`.) Add the import:

```tsx
import { useAppSettings } from '@/hooks/useAppSettings'
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/app/page.test.tsx`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: render dashboard sections from layout config"
```

## Task 3.2: Section rendering + density from config (Board)

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required** (Board parity is critical — fixed 1080×1920)

**Files:**
- Modify: `src/app/board/page.tsx` — render sections per `settings.layout.board`; apply `settings.board.densityOverride` (when not `'auto'`, use it instead of `useAutoDensity`).
- Modify: `src/app/board/page.test.tsx`.

- [ ] **Step 1: Write the failing test** (density override forces a tier)

```tsx
// add to src/app/board/page.test.tsx
it('uses the density override when not auto', async () => {
  const overridden = { ...DEFAULT_SETTINGS, board: { densityOverride: 'dense' as const } }
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) =>
    url === '/api/settings' ? { ok: true, json: async () => overridden } : { json: async () => [] }
  ))
  const { container } = render(<BoardPage />)
  await screen.findByText('Cylinders')
  expect(container.querySelector('.text-xs')).toBeTruthy() // dense padding class present
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/board/page.test.tsx`
Expected: FAIL — override not applied.

- [ ] **Step 3: Refactor `src/app/board/page.tsx`**

Apply density override:

```tsx
  const autoTier = useAutoDensity(containerRef, 1920)
  const tier = settings.board.densityOverride === 'auto' ? autoTier : settings.board.densityOverride
```

Render the four sections (`stats`, `problems`, `cylinders`, `equipment`) via a config-driven map like Task 3.1, ordered/filtered by `settings.layout.board`. Preserve existing markup inside each section node exactly (reviewer checks pixel parity at default settings).

- [ ] **Step 4: Run tests**

Run: `npm test -- src/app/board/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/board/page.tsx src/app/board/page.test.tsx
git commit -m "feat: Board renders sections and density from settings"
```

## Task 3.3: Layout & Board panel

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required**

**Files:**
- Create: `src/app/admin/layout-board/page.tsx`
- Create: `src/components/admin/SectionOrderEditor.tsx`
- Test: `src/app/admin/layout-board/page.test.tsx`

**Interfaces:** consumes `useAdminSettings`, `SaveBar`. `SectionOrderEditor` takes `sections: SectionConfig[]` + `onChange`, with up/down reorder buttons and a visibility toggle (no drag-drop dependency — keep it free and dependency-light).

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/layout-board/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LayoutBoardPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => DEFAULT_SETTINGS }))
})

describe('LayoutBoardPage', () => {
  it('toggles a dashboard section visibility and saves', async () => {
    render(<LayoutBoardPage />)
    const toggle = await screen.findByLabelText(/dashboard: equipment visible/i)
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[1]?.method === 'PUT')
      const body = JSON.parse(put![1].body)
      expect(body.layout.dashboard.find((s: any) => s.key === 'equipment').visible).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/layout-board/page.test.tsx`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Implement `SectionOrderEditor`**

```tsx
// src/components/admin/SectionOrderEditor.tsx
'use client'

import type { SectionConfig } from '@/lib/settings/types'

const LABELS: Record<string, string> = {
  stats: 'Stats bar',
  problems: 'Problem banner',
  cylinders: 'Cylinders',
  equipment: 'Equipment',
}

export function SectionOrderEditor({
  title,
  scope,
  sections,
  onChange,
}: {
  title: string
  scope: string
  sections: SectionConfig[]
  onChange: (next: SectionConfig[]) => void
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const toggle = (i: number) => {
    const next = sections.map((s, k) => (k === i ? { ...s, visible: !s.visible } : s))
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gold">{title}</h3>
      {sections.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 rounded border border-gold/20 bg-panel px-3 py-2">
          <span className="flex-1 text-sm">{LABELS[s.key] ?? s.key}</span>
          <label className="flex items-center gap-1 text-xs text-ink-dim">
            <input
              type="checkbox"
              aria-label={`${scope}: ${s.key} visible`}
              checked={s.visible}
              onChange={() => toggle(i)}
            />
            visible
          </label>
          <button aria-label={`${scope}: move ${s.key} up`} onClick={() => move(i, -1)} className="px-2">↑</button>
          <button aria-label={`${scope}: move ${s.key} down`} onClick={() => move(i, 1)} className="px-2">↓</button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Implement the panel**

```tsx
// src/app/admin/layout-board/page.tsx
'use client'

import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'
import { SectionOrderEditor } from '@/components/admin/SectionOrderEditor'
import type { BoardDensity } from '@/lib/settings/types'

const DENSITIES: BoardDensity[] = ['auto', 'comfortable', 'compact', 'dense']

export default function LayoutBoardPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gold-bright">Layout &amp; Board</h2>

      <SectionOrderEditor
        title="Dashboard sections"
        scope="dashboard"
        sections={settings.layout.dashboard}
        onChange={(dashboard) =>
          setSettings({ ...settings, layout: { ...settings.layout, dashboard } })
        }
      />
      <SectionOrderEditor
        title="Board sections"
        scope="board"
        sections={settings.layout.board}
        onChange={(board) => setSettings({ ...settings, layout: { ...settings.layout, board } })}
      />

      <label className="block text-sm text-ink-dim">Board density
        <select
          aria-label="Board density"
          className="mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink"
          value={settings.board.densityOverride}
          onChange={(e) =>
            setSettings({ ...settings, board: { densityOverride: e.target.value as BoardDensity } })
          }
        >
          {DENSITIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/app/admin/layout-board/page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/layout-board src/components/admin/SectionOrderEditor.tsx
git commit -m "feat: add /admin/layout-board panel with reorder, visibility, density"
```

---

# STAGE 4 — Scan actions

Delivers: `/admin/scan-actions` toggles which buttons appear on scan screens (per item-type + per-item overrides); scan pages respect the config.

## Task 4.1: resolveScanActions helper

**Model:** Sonnet 5 · **Review:** Sonnet 5

**Files:**
- Create: `src/lib/settings/resolveScanActions.ts`
- Test: `src/lib/settings/resolveScanActions.test.ts`

**Interfaces:**
- Produces:
  - `resolveTankActions(settings: AppSettings, tankId: string): TankActionFlags`
  - `resolveEquipmentActions(settings: AppSettings, itemId: string): EquipmentActionFlags`
  Per-item override merges over the type default.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/settings/resolveScanActions.test.ts
import { describe, it, expect } from 'vitest'
import { resolveTankActions, resolveEquipmentActions } from './resolveScanActions'
import { DEFAULT_SETTINGS } from './types'

describe('resolveScanActions', () => {
  it('returns type defaults when no override', () => {
    expect(resolveTankActions(DEFAULT_SETTINGS, 't1')).toEqual(DEFAULT_SETTINGS.scanActions.tankDefaults)
  })

  it('applies a per-item override over the default', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      scanActions: { ...DEFAULT_SETTINGS.scanActions, overrides: { t1: { retire: false } } },
    }
    expect(resolveTankActions(s, 't1').retire).toBe(false)
    expect(resolveTankActions(s, 't1').psi).toBe(true)
    expect(resolveEquipmentActions(s, 't1').retire).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/settings/resolveScanActions.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/settings/resolveScanActions.ts
import type { AppSettings, TankActionFlags, EquipmentActionFlags } from './types'

export function resolveTankActions(settings: AppSettings, tankId: string): TankActionFlags {
  const override = settings.scanActions.overrides[tankId] ?? {}
  return { ...settings.scanActions.tankDefaults, ...override }
}

export function resolveEquipmentActions(settings: AppSettings, itemId: string): EquipmentActionFlags {
  const override = settings.scanActions.overrides[itemId] ?? {}
  return { ...settings.scanActions.equipmentDefaults, ...override }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/settings/resolveScanActions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings/resolveScanActions.ts src/lib/settings/resolveScanActions.test.ts
git commit -m "feat: add resolveScanActions helper"
```

## Task 4.2: Scan pages respect action config

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required** (verify default parity)

**Files:**
- Modify: `src/app/scan/tank/[id]/page.tsx` — gate PSI/logProblem/retire blocks on `resolveTankActions`.
- Modify: `src/app/scan/equipment/[id]/page.tsx` — gate status/logProblem/retire.
- Modify/create: `src/app/scan/tank/[id]/page.test.tsx` (add a test hiding retire).

**Interfaces:** consumes `useAppSettings`, `resolveTankActions`/`resolveEquipmentActions`.

- [ ] **Step 1: Write the failing test**

```tsx
// add to src/app/scan/tank/[id]/page.test.tsx
import { DEFAULT_SETTINGS } from '@/lib/settings/types'
vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    ...DEFAULT_SETTINGS,
    scanActions: { ...DEFAULT_SETTINGS.scanActions, overrides: { 'tank-1': { retire: false } } },
  }),
}))
// with a loaded tank id 'tank-1', assert:
// expect(screen.queryByText(/retire this tank/i)).not.toBeInTheDocument()
```

(Reviewer ensures the existing scan tests still pass with default settings — all actions shown.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/scan/tank/[id]/page.test.tsx`
Expected: FAIL — retire always rendered.

- [ ] **Step 3: Edit the tank scan page**

Add near the top of the component:

```tsx
  const settings = useAppSettings()
  const actions = resolveTankActions(settings, params.id)
```

Imports:

```tsx
import { useAppSettings } from '@/hooks/useAppSettings'
import { resolveTankActions } from '@/lib/settings/resolveScanActions'
```

Wrap each action block in its flag, e.g. the PSI block with `{actions.psi && ( ... )}`, the problem block with `{actions.logProblem && ( ... )}`, and the retire button with `{actions.retire && ( ... )}`.

- [ ] **Step 4: Edit the equipment scan page** the same way, using `resolveEquipmentActions(settings, params.id)` and its `status`/`logProblem`/`retire` flags.

- [ ] **Step 5: Run the scan tests**

Run: `npm test -- src/app/scan`
Expected: PASS (defaults show everything; override hides retire).

- [ ] **Step 6: Commit**

```bash
git add src/app/scan
git commit -m "feat: scan pages respect configured actions"
```

## Task 4.3: Scan actions panel

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required**

**Files:**
- Create: `src/app/admin/scan-actions/page.tsx`
- Test: `src/app/admin/scan-actions/page.test.tsx`

**Interfaces:** consumes `useAdminSettings`, `SaveBar`. Edits `tankDefaults` and `equipmentDefaults` (per-item overrides deferred to a later iteration but the data model already supports them; the panel notes this).

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/admin/scan-actions/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanActionsPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => DEFAULT_SETTINGS }))
})

describe('ScanActionsPage', () => {
  it('disables tank retire and saves', async () => {
    render(<ScanActionsPage />)
    const cb = await screen.findByLabelText(/tank: retire/i)
    fireEvent.click(cb)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(JSON.parse(put![1].body).scanActions.tankDefaults.retire).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/scan-actions/page.test.tsx`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/app/admin/scan-actions/page.tsx
'use client'

import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'

export default function ScanActionsPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()
  const { tankDefaults, equipmentDefaults } = settings.scanActions

  const setTank = (k: keyof typeof tankDefaults) =>
    setSettings({
      ...settings,
      scanActions: { ...settings.scanActions, tankDefaults: { ...tankDefaults, [k]: !tankDefaults[k] } },
    })
  const setEquip = (k: keyof typeof equipmentDefaults) =>
    setSettings({
      ...settings,
      scanActions: { ...settings.scanActions, equipmentDefaults: { ...equipmentDefaults, [k]: !equipmentDefaults[k] } },
    })

  const row = (label: string, checked: boolean, onChange: () => void) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" aria-label={label} checked={checked} onChange={onChange} />
      {label}
    </label>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gold-bright">Scan actions</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gold">Tank scan screen</h3>
        {row('Tank: PSI update', tankDefaults.psi, () => setTank('psi'))}
        {row('Tank: status toggle', tankDefaults.status, () => setTank('status'))}
        {row('Tank: log a problem', tankDefaults.logProblem, () => setTank('logProblem'))}
        {row('Tank: retire', tankDefaults.retire, () => setTank('retire'))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gold">Equipment scan screen</h3>
        {row('Equipment: status toggle', equipmentDefaults.status, () => setEquip('status'))}
        {row('Equipment: log a problem', equipmentDefaults.logProblem, () => setEquip('logProblem'))}
        {row('Equipment: retire', equipmentDefaults.retire, () => setEquip('retire'))}
      </div>

      <p className="text-xs text-ink-dim">These apply to all items of each type. Per-item exceptions can be added later.</p>
      <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/scan-actions/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/scan-actions
git commit -m "feat: add /admin/scan-actions panel"
```

---

# STAGE 5 — Custom QR + label appearance

Delivers: custom standalone QR codes (point to any URL) + label appearance controls; `/labels` moves under `/admin`.

## Task 5.1: custom_qr table + repo methods

**Model:** Sonnet 5 · **Review:** Sonnet 5

**Files:**
- Create: `supabase/migrations/0004_custom_qr.sql`
- Modify: `src/lib/types.ts` — add `CustomQrCode`, `NewCustomQrInput`.
- Modify: `src/lib/repository.ts`, `src/lib/supabaseRepository.ts`
- Test: append to `src/lib/repository.test.ts`

**Interfaces:**
- Types: `CustomQrCode { id, label, targetUrl, active, createdBy, createdAt }`, `NewCustomQrInput { label, targetUrl, createdBy }`.
- Repo: `getCustomQrCodes(): Promise<CustomQrCode[]>`, `insertCustomQrCode(input): Promise<CustomQrCode>`, `deleteCustomQrCode(id): Promise<void>`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0004_custom_qr.sql
create table custom_qr_codes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  target_url text not null,
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table custom_qr_codes enable row level security;
create policy "public read custom qr" on custom_qr_codes for select using (true);
-- writes via service-role only (admin routes); no anon write policy.

alter publication supabase_realtime add table custom_qr_codes;
```

- [ ] **Step 2: Add types to `src/lib/types.ts`**

```ts
export interface CustomQrCode {
  id: string
  label: string
  targetUrl: string
  active: boolean
  createdBy: string
  createdAt: string
}

export interface NewCustomQrInput {
  label: string
  targetUrl: string
  createdBy: string
}
```

- [ ] **Step 3: Write the failing repo test** (append to `src/lib/repository.test.ts`)

```ts
describe('InMemoryRepository custom QR', () => {
  it('inserts, lists, and deletes custom QR codes', async () => {
    const repo = new InMemoryRepository()
    const code = await repo.insertCustomQrCode({ label: 'SDS binder', targetUrl: 'https://x.co', createdBy: 'Chief' })
    expect((await repo.getCustomQrCodes()).map((c) => c.id)).toEqual([code.id])
    await repo.deleteCustomQrCode(code.id)
    expect(await repo.getCustomQrCodes()).toEqual([])
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- src/lib/repository.test.ts`
Expected: FAIL — methods missing.

- [ ] **Step 5: Add interface + InMemory impl** (`src/lib/repository.ts`)

Interface:

```ts
  getCustomQrCodes(): Promise<CustomQrCode[]>
  insertCustomQrCode(input: NewCustomQrInput): Promise<CustomQrCode>
  deleteCustomQrCode(id: string): Promise<void>
```

Import `CustomQrCode, NewCustomQrInput` in the types import list.

InMemory:

```ts
  private customQr: CustomQrCode[] = []

  async getCustomQrCodes(): Promise<CustomQrCode[]> {
    return [...this.customQr]
  }

  async insertCustomQrCode(input: NewCustomQrInput): Promise<CustomQrCode> {
    const code: CustomQrCode = {
      id: crypto.randomUUID(),
      label: input.label,
      targetUrl: input.targetUrl,
      active: true,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    }
    this.customQr.push(code)
    return code
  }

  async deleteCustomQrCode(id: string): Promise<void> {
    this.customQr = this.customQr.filter((c) => c.id !== id)
  }
```

- [ ] **Step 6: Add Supabase impl + mapper** (`src/lib/supabaseRepository.ts`)

```ts
export function mapRowToCustomQr(row: any): CustomQrCode {
  return {
    id: row.id,
    label: row.label,
    targetUrl: row.target_url,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}
```

```ts
  async getCustomQrCodes(): Promise<CustomQrCode[]> {
    const { data, error } = await this.client
      .from('custom_qr_codes')
      .select('*')
      .eq('active', true)
      .order('created_at')
    if (error) throw error
    return (data ?? []).map(mapRowToCustomQr)
  }

  async insertCustomQrCode(input: NewCustomQrInput): Promise<CustomQrCode> {
    const { data, error } = await this.client
      .from('custom_qr_codes')
      .insert({ label: input.label, target_url: input.targetUrl, created_by: input.createdBy })
      .select('*')
      .single()
    if (error) throw error
    return mapRowToCustomQr(data)
  }

  async deleteCustomQrCode(id: string): Promise<void> {
    const { error } = await this.client.from('custom_qr_codes').delete().eq('id', id)
    if (error) throw error
  }
```

Import the new types in `supabaseRepository.ts`.

- [ ] **Step 7: Run tests**

Run: `npm test -- src/lib/repository.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0004_custom_qr.sql src/lib/types.ts src/lib/repository.ts src/lib/supabaseRepository.ts src/lib/repository.test.ts
git commit -m "feat: add custom_qr_codes table + repository methods"
```

## Task 5.2: custom QR API routes

**Model:** Sonnet 5 · **Review:** Sonnet 5

**Files:**
- Create: `src/app/api/custom-qr/route.ts` (`GET` public list; `POST` guarded create — under `/api/admin`? No: create must be guarded, so place create under `/api/admin/custom-qr`).
- Create: `src/app/api/custom-qr/route.ts` — `GET` only (public read for the labels page).
- Create: `src/app/api/admin/custom-qr/route.ts` — `POST` create.
- Create: `src/app/api/admin/custom-qr/[id]/route.ts` — `DELETE`.
- Test: `src/app/api/custom-qr/route.test.ts`, `src/app/api/admin/custom-qr/route.test.ts`

**Interfaces:**
- `GET /api/custom-qr` → `CustomQrCode[]` (active).
- `POST /api/admin/custom-qr` body `{ label, targetUrl }` → 201 `CustomQrCode`.
- `DELETE /api/admin/custom-qr/[id]` → `{ ok: true }`.

- [ ] **Step 1: Write failing tests**

```ts
// src/app/api/admin/custom-qr/route.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { POST } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

afterEach(() => __setRepositoryForTests(null))

describe('POST /api/admin/custom-qr', () => {
  it('creates a code', async () => {
    __setRepositoryForTests(new InMemoryRepository())
    const res = await POST(new Request('http://localhost/api/admin/custom-qr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'SDS', targetUrl: 'https://x.co' }),
    }))
    expect(res.status).toBe(201)
    expect((await res.json()).label).toBe('SDS')
  })

  it('400s on missing url', async () => {
    __setRepositoryForTests(new InMemoryRepository())
    const res = await POST(new Request('http://localhost/api/admin/custom-qr', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'SDS' }),
    }))
    expect(res.status).toBe(400)
  })
})
```

```ts
// src/app/api/custom-qr/route.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { GET } from './route'
import { InMemoryRepository } from '@/lib/repository'
import { __setRepositoryForTests } from '@/lib/repositoryFactory'

afterEach(() => __setRepositoryForTests(null))

describe('GET /api/custom-qr', () => {
  it('lists active codes', async () => {
    const repo = new InMemoryRepository()
    await repo.insertCustomQrCode({ label: 'A', targetUrl: 'https://a.co', createdBy: 'x' })
    __setRepositoryForTests(repo)
    const res = await GET()
    expect((await res.json())).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/custom-qr/route.test.ts src/app/api/admin/custom-qr/route.test.ts`
Expected: FAIL — routes missing.

- [ ] **Step 3: Implement the routes**

```ts
// src/app/api/custom-qr/route.ts
import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repositoryFactory'

export async function GET() {
  const repo = getRepository()
  return NextResponse.json(await repo.getCustomQrCodes())
}
```

```ts
// src/app/api/admin/custom-qr/route.ts
import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'

export async function POST(request: Request) {
  const { label, targetUrl } = (await request.json()) as { label?: string; targetUrl?: string }
  if (!label || !targetUrl) {
    return NextResponse.json({ error: 'label and targetUrl are required' }, { status: 400 })
  }
  const repo = getAdminRepository()
  const code = await repo.insertCustomQrCode({ label, targetUrl, createdBy: 'admin' })
  return NextResponse.json(code, { status: 201 })
}
```

```ts
// src/app/api/admin/custom-qr/[id]/route.ts
import { NextResponse } from 'next/server'
import { getAdminRepository } from '@/lib/repositoryFactory'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const repo = getAdminRepository()
  await repo.deleteCustomQrCode(params.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/custom-qr/route.test.ts src/app/api/admin/custom-qr/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/custom-qr src/app/api/admin/custom-qr
git commit -m "feat: add custom QR API routes (public list, guarded create/delete)"
```

## Task 5.3: QR panel + label appearance + labels page updates

**Model:** Sonnet 5 · **Review:** Sonnet 5 · **UI/UX skills: required**

**Files:**
- Create: `src/app/admin/qr/page.tsx` — manage custom codes + label appearance (`settings.labels`).
- Modify: `src/app/labels/page.tsx` — render custom codes; apply `settings.labels` (size, showLogo, footerText).
- Create: `src/app/admin/passcode/page.tsx` — change-passcode UI (closes Stage 0's nav item).
- Modify: `src/app/page.tsx` — the "Print QR labels →" link can stay at `/labels` (public print view remains).
- Test: `src/app/admin/qr/page.test.tsx`, `src/app/admin/passcode/page.test.tsx`

**Interfaces:** consumes `useAdminSettings`, `SaveBar`, `/api/custom-qr`, `/api/admin/custom-qr`.

- [ ] **Step 1: Write the failing QR panel test**

```tsx
// src/app/admin/qr/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import QrPage from './page'
import { DEFAULT_SETTINGS } from '@/lib/settings/types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, opts?: any) => {
    if (url === '/api/settings') return { ok: true, json: async () => DEFAULT_SETTINGS }
    if (url === '/api/custom-qr') return { ok: true, json: async () => [] }
    if (url === '/api/admin/custom-qr' && opts?.method === 'POST')
      return { ok: true, status: 201, json: async () => ({ id: '1', label: 'SDS', targetUrl: 'https://x.co', active: true, createdBy: 'admin', createdAt: '' }) }
    return { ok: true, json: async () => ({}) }
  }))
})

describe('QrPage', () => {
  it('creates a custom code', async () => {
    render(<QrPage />)
    fireEvent.change(await screen.findByLabelText(/code label/i), { target: { value: 'SDS' } })
    fireEvent.change(screen.getByLabelText(/target url/i), { target: { value: 'https://x.co' } })
    fireEvent.click(screen.getByRole('button', { name: /add code/i }))
    await waitFor(() => {
      const post = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0] === '/api/admin/custom-qr' && c[1]?.method === 'POST'
      )
      expect(post).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/qr/page.test.tsx`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Implement the QR panel**

```tsx
// src/app/admin/qr/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAdminSettings } from '@/hooks/useAdminSettings'
import { SaveBar } from '@/components/admin/SaveBar'
import { QrCode } from '@/components/QrCode'
import type { CustomQrCode, LabelSettings } from '@/lib/types'
import type { AppSettings } from '@/lib/settings/types'

const SIZES: LabelSettings['size'][] = ['small', 'medium', 'large']

export default function QrPage() {
  const { settings, setSettings, save, saving, error, savedAt } = useAdminSettings()
  const [codes, setCodes] = useState<CustomQrCode[]>([])
  const [label, setLabel] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const loadCodes = async () => {
    const r = await fetch('/api/custom-qr')
    if (r.ok) setCodes(await r.json())
  }
  useEffect(() => { loadCodes() }, [])

  async function addCode() {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/admin/custom-qr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label, targetUrl }),
      })
      if (!r.ok) throw new Error('failed')
      setLabel(''); setTargetUrl('')
      await loadCodes()
    } catch {
      setErr('Could not add code — check the URL and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function removeCode(id: string) {
    const r = await fetch(`/api/admin/custom-qr/${id}`, { method: 'DELETE' })
    if (r.ok) await loadCodes()
  }

  const setLabels = (patch: Partial<AppSettings['labels']>) =>
    setSettings({ ...settings, labels: { ...settings.labels, ...patch } })
  const field = 'mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink'

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gold-bright">QR codes &amp; labels</h2>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gold">Custom standalone codes</h3>
        <label className="block text-sm text-ink-dim">Code label
          <input aria-label="Code label" className={field} value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="block text-sm text-ink-dim">Target URL
          <input aria-label="Target URL" className={field} value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
        </label>
        {err && <p className="text-sm text-status-red">{err}</p>}
        <button onClick={addCode} disabled={busy || !label || !targetUrl}
          className="rounded bg-gold px-4 py-2 font-bold text-bg disabled:opacity-50">Add code</button>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {codes.map((c) => (
            <div key={c.id} className="rounded border border-gold/20 bg-panel p-3 text-center">
              <QrCode value={c.targetUrl} />
              <p className="mt-1 text-sm">{c.label}</p>
              <button onClick={() => removeCode(c.id)} className="text-xs text-status-red underline">Delete</button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gold">Label appearance</h3>
        <label className="block text-sm text-ink-dim">Size
          <select aria-label="Label size" className={field} value={settings.labels.size}
            onChange={(e) => setLabels({ size: e.target.value as LabelSettings['size'] })}>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" aria-label="Show logo on labels" checked={settings.labels.showLogo}
            onChange={(e) => setLabels({ showLogo: e.target.checked })} />
          Show logo on labels
        </label>
        <label className="block text-sm text-ink-dim">Footer text
          <input aria-label="Label footer text" className={field} value={settings.labels.footerText}
            onChange={(e) => setLabels({ footerText: e.target.value })} />
        </label>
        <SaveBar onSave={save} saving={saving} error={error} savedAt={savedAt} />
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Write the passcode-change page test + implement it**

```tsx
// src/app/admin/passcode/page.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PasscodePage from './page'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }))
})

describe('PasscodePage', () => {
  it('PUTs the new passcode', async () => {
    render(<PasscodePage />)
    fireEvent.change(screen.getByLabelText(/new passcode/i), { target: { value: 'longenough' } })
    fireEvent.click(screen.getByRole('button', { name: /update passcode/i }))
    await waitFor(() => {
      const put = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[1]?.method === 'PUT')
      expect(put![0]).toBe('/api/admin/passcode')
    })
  })
})
```

```tsx
// src/app/admin/passcode/page.tsx
'use client'

import { useState } from 'react'

export default function PasscodePage() {
  const [newPasscode, setNewPasscode] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function update() {
    setStatus(''); setError('')
    try {
      const res = await fetch('/api/admin/passcode', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPasscode }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('Passcode updated.')
      setNewPasscode('')
    } catch {
      setError('Could not update passcode (min 4 characters).')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gold-bright">Change passcode</h2>
      <label className="block text-sm text-ink-dim">New passcode
        <input aria-label="New passcode" type="password" value={newPasscode}
          onChange={(e) => setNewPasscode(e.target.value)}
          className="mt-1 block w-full rounded border border-gold/20 bg-panel px-3 py-2 text-ink" />
      </label>
      {error && <p className="text-sm text-status-red">{error}</p>}
      {status && <p className="text-sm text-status-green">{status}</p>}
      <button onClick={update} disabled={newPasscode.length < 4}
        className="rounded bg-gold px-4 py-2 font-bold text-bg disabled:opacity-50">Update passcode</button>
    </div>
  )
}
```

- [ ] **Step 5: Update `src/app/labels/page.tsx`** to render custom codes and apply `settings.labels`

Add `useAppSettings` + fetch `/api/custom-qr`; map custom codes into label cards (using `QrCode value={code.targetUrl}`); when `settings.labels.showLogo` is false, hide the logo; append `settings.labels.footerText` under each label; apply a size class from `settings.labels.size`. Reviewer verifies the default (`medium`, showLogo true, empty footer) matches today's layout.

- [ ] **Step 6: Run tests**

Run: `npm test -- src/app/admin/qr/page.test.tsx src/app/admin/passcode/page.test.tsx src/app/labels/page.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/qr src/app/admin/passcode src/app/labels/page.tsx
git commit -m "feat: add QR/labels admin panel, passcode-change page, custom codes on labels"
```

---

# Final: Whole-branch review + deploy

## Task F.1: Whole-branch review

**Model:** Opus 4.8 · **Review:** Opus (this IS the review)

- [ ] **Step 1:** Run the full suite: `npm test` → all green.
- [ ] **Step 2:** Run `npm run build` → succeeds, no warnings regressed.
- [ ] **Step 3:** Dispatch a whole-branch review (Opus) across all stages looking specifically for cross-task gaps (the class of bug prior builds hit): any admin mutation that skips the `.ok` check; any component still reading a hardcoded value that now lives in settings; any `/api/admin/*` route reachable without the middleware matcher covering it; default-settings visual parity on dashboard, Board, scan pages, and labels; secrets never imported into client bundles (`getSupabaseAdminClient` server-only).
- [ ] **Step 4:** Fix findings in a single coordinated commit; re-run suite + build.

## Task F.2: Deploy

**Model:** Sonnet 5

- [ ] **Step 1:** Confirm env vars set in Vercel (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET`) for Production and Preview.
- [ ] **Step 2:** Apply migrations `0002`–`0005` and create the `branding` Storage bucket in Supabase.
- [ ] **Step 3:** Seed the initial passcode (per `docs/admin-setup.md`).
- [ ] **Step 4:** `git push origin master` (lands as Preview), then `vercel --prod` to promote (Production Branch mismatch is unresolved — do not assume push = live).
- [ ] **Step 5:** Smoke test live: `/admin` redirects to login; correct passcode reaches `/admin`; edit branding → dashboard + Board update; upload an image; toggle a section; toggle a scan action; add a custom QR; change passcode.

---

## Self-Review (author checklist, completed)

**Spec coverage:**
- Branding text → Stage 1 (Task 1.1), plumbed in Tasks 0.8–0.10. ✓
- Images → Stage 2 (2.1 route, 2.2 panel). ✓
- Layout & Board → Stage 3 (3.1 dashboard, 3.2 Board, 3.3 panel). ✓
- Scan actions → Stage 4 (4.1 resolver, 4.2 pages, 4.3 panel). ✓
- Custom QR + labels → Stage 5 (5.1 table/repo, 5.2 routes, 5.3 panel + labels). ✓
- Passcode access (hashed, tightened RLS, changeable, cookie, middleware) → Tasks 0.11–0.16, 5.3 (change UI). ✓
- Settings store keystone + zero-regression defaults → Tasks 0.1–0.10. ✓
- Free-tier, error-handling, model assignments, UI/UX skills → Global Constraints + per-task lines. ✓

**Placeholder scan:** No "TBD/implement later"; every code step shows real code. Two intentional prose-guided edits (Task 3.2 section-map, Task 5.3 labels-page) reference exact settings fields and parity requirements rather than pasting the full existing files — acceptable because they modify large existing files whose current contents are in the repo.

**Type consistency:** `AppSettings`/`DEFAULT_SETTINGS`/`SectionConfig`/`SECTION_KEYS`/`TankActionFlags`/`EquipmentActionFlags`/`LabelSettings` defined in Task 0.1 and used consistently. Repo methods `getSettings`/`saveSettings` (0.3), `getAdminPasscodeHash`/`setAdminPasscodeHash` (0.13), custom-qr methods (5.1) match across interface, InMemory, Supabase, and callers. `getAdminRepository`/`getRepository`/`__setRepositoryForTests` used consistently. Cookie name `hazmat_admin` and `ADMIN_SESSION_SECRET` consistent across auth route (0.14) and middleware (0.15).
