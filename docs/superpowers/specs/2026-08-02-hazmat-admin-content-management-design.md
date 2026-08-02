# HAZMAT Dashboard — Admin Content Management (Design Spec)

**Date:** 2026-08-02
**Status:** Approved for planning
**Author:** Brainstorming session (superpowers)

## 1. Purpose

Give the HAZMAT team a passcode-gated `/admin` area to change app content and
configuration without a developer — branding text, images, layout, QR scan-screen
actions, and custom QR codes. The app is currently all hardcoded strings and static
`/public` images; this introduces a **settings store** so "what the app shows" becomes
editable data.

Hard constraints from the user:

- **Everything stays free.** Vercel free tier + Supabase free tier only (Storage 1 GB
  is ample for images). No paid services may be proposed or introduced.
- **Complete coverage.** All five capabilities below are fully specified and will be
  implemented — nothing deferred as "someday."
- **Staged delivery.** Build on a shared foundation, then ship capabilities as
  independent, individually-reviewable stages.
- **UI/UX via skills.** `/impeccable` and `/ui-ux-pro-max` (all their features) drive
  the design of every admin screen.
- **Token-conscious.** The implementation plan assigns Claude models per task to match
  difficulty to cost.

## 2. Background / current state

- **Stack:** Next.js 14 (App Router, TS), Tailwind, Supabase (Postgres + Realtime),
  `qrcode` npm package, Vercel hosting. PWA-installable.
- **Three surfaces:** `/board` (wall display), Command Center (`/`, `/log`, `/labels`),
  QR quick-action flow (`/scan/tank/[id]`, `/scan/equipment/[id]`, `/scan/problem`).
- **No auth anywhere** — the link is the access control; writes attributed by
  typed/remembered name only. Supabase RLS is fully permissive (incl. DELETE).
- **Patterns to reuse:** repository interface + `SupabaseRepository`; services layer
  (`src/lib/services/*`); per-resource API routes (`src/app/api/*`); live sync via
  `useRealtimeRefetch`; vitest per-file tests; commits go directly to `master`.

**Content currently hardcoded (the edit targets):**

- Header title `"HAZMAT Inventory"` — `src/components/DashboardHeader.tsx`
- Subtitle `"Engine 11 · Ladder 21 · RRT 5"` — duplicated in `src/app/page.tsx`,
  `src/app/board/page.tsx`, `src/app/log/page.tsx`
- Tab/metadata title `"HAZMAT Inventory Dashboard"` — `src/app/layout.tsx`
- Section headings `"Cylinders"`, `"Equipment"` — `src/app/board/page.tsx`
- Images `gfd-badge.png`, `hazmat-emblem.png` — `public/`
- Scan-screen action buttons — hardcoded in the `/scan/*` pages
- Equipment category labels — `src/lib/equipmentLabels.ts` (out of scope unless trivial)

## 3. Requirements

### 3.1 Capabilities (all in scope)

1. **Branding text** — edit title, subtitle, tab title, and section headings; changes
   apply live across all surfaces (one source of truth replaces the 3× duplicated
   subtitle).
2. **Images** — upload/swap the badge and emblem, and upload new photos, via Supabase
   Storage; the stored public URL is saved into settings and consumed by components.
3. **Layout & Board** — reorder and show/hide sections on both the dashboard and the
   wall Board; tune Board display (density override).
4. **Scan actions** — toggle which action buttons appear on scan screens, configured
   per item-type (all tanks / all equipment) with optional per-item overrides.
5. **Custom QR + labels** — create standalone QR codes that point to any URL entered by
   the admin; control label appearance (size, show/hide logo, custom text); continue to
   print per-item labels. The existing `/labels` page moves under `/admin`.

### 3.2 Access control

- `/admin/*` and `/api/admin/*` are gated by a **single shared passcode**.
- Passcode is entered once and remembered per device (long-lived signed cookie).
- No user accounts; no per-use friction for the normal (non-admin) app.
- The passcode is changeable from inside the admin panel (no redeploy).
- All other routes remain exactly as open as they are today.

### 3.3 Non-functional

- **Zero visual regression** before any edit: `AppSettings` defaults must equal the
  current hardcoded values; enforced by a test.
- **Free-tier only** for all infrastructure.
- **Live sync**: settings changes propagate to all devices (incl. the wall Board) via
  Supabase Realtime.
- **Tests** follow repo convention (vitest, per-file) for new services, routes, and
  pages.

## 4. Architecture

### 4.1 Settings store (keystone)

- **Table `app_settings`** — single row (fixed id, e.g. `'singleton'`), columns:
  `config jsonb`, `updated_at`, `updated_by`.
- **Typed `AppSettings`** interface (in `src/lib/types.ts` or a new
  `src/lib/settings/types.ts`) with a `DEFAULT_SETTINGS` constant whose values equal
  today's hardcoded strings/paths.
- **Read path:** `GET /api/settings` returns the row merged over `DEFAULT_SETTINGS`
  (so missing keys always resolve to safe defaults). A `useAppSettings()` client hook
  fetches it and subscribes to realtime on `app_settings`, mirroring the existing
  `useRealtimeRefetch` pattern.
- **Write path:** admin-only `PUT /api/admin/settings` (service-role key) writes the
  merged config. Last-write-wins is acceptable for a single-admin workflow.
- **Consumption refactor:** `DashboardHeader`, `page.tsx`, `board/page.tsx`,
  `log/page.tsx`, and the `/scan/*` pages read from `useAppSettings()` instead of
  literals. Section rendering iterates an ordered, visibility-filtered list from
  `settings.layout`.

Proposed `AppSettings` shape (final field names settled during implementation):

```ts
interface AppSettings {
  branding: {
    title: string          // default "HAZMAT Inventory"
    subtitle: string       // default "Engine 11 · Ladder 21 · RRT 5"
    tabTitle: string       // default "HAZMAT Inventory Dashboard"
    badgeImageUrl: string  // default "/gfd-badge.png"
    emblemImageUrl: string // default "/hazmat-emblem.png"
  }
  headings: {
    cylinders: string      // default "Cylinders"
    equipment: string      // default "Equipment"
  }
  layout: {
    dashboard: SectionConfig[] // ordered [{ key, visible }]
    board: SectionConfig[]
  }
  board: {
    densityOverride: 'auto' | 'comfortable' | 'compact' | 'dense' // default 'auto'
  }
  scanActions: {
    tankDefaults: TankActionFlags       // { psi, status, logProblem, retire }
    equipmentDefaults: EquipmentActionFlags
    overrides: Record<string, Partial<ActionFlags>> // keyed by item id
  }
  labels: {
    size: 'small' | 'medium' | 'large'
    showLogo: boolean
    footerText: string
  }
}

interface SectionConfig { key: string; visible: boolean }
```

### 4.2 Access control

- **Table `admin_config`** — holds the passcode **hash** (e.g. bcrypt/scrypt/sha-256
  with salt), with **tightened RLS**: anon role can neither read nor write it; only the
  server-side service-role key touches it. (This is the one table that departs from the
  app's otherwise-permissive RLS.)
- **Env vars (free):** `ADMIN_SESSION_SECRET` (HMAC signing key for the cookie) and the
  Supabase `SERVICE_ROLE_KEY` (server-only). No secrets shipped to the client.
- **Verify flow:** `POST /api/admin/auth` compares the submitted passcode against the
  stored hash server-side; on success sets a long-lived, HttpOnly, signed cookie.
- **Guard:** Next.js **middleware** validates the cookie for `/admin/*` and
  `/api/admin/*`; invalid/missing → redirect to the passcode-entry screen.
- **Change passcode:** an admin panel writes a new hash via a service-role route.
- **Bootstrap:** first-run seed sets an initial passcode (documented setup step; via
  migration/seed or a one-time env-var-driven initializer). No lockout path left open.

### 4.3 Images / Supabase Storage

- Public-read bucket **`branding`** (free tier, 1 GB).
- Upload via admin-only server route (service-role): validate type/size (cap to a
  reasonable limit to respect the free tier), store, return public URL, persist URL to
  settings. Components render `settings.branding.*ImageUrl`.

### 4.4 Custom QR + labels

- **Table `custom_qr_codes`** — `id`, `label`, `target_url`, `active`, `created_at`,
  `created_by`. Rendered as scannable codes on the labels page alongside item labels.
- Label appearance (size, logo toggle, footer text) lives in `settings.labels` and is
  applied by the labels page. `/labels` relocates under `/admin`.

### 4.5 What stays untouched

Operational writes (tank PSI, equipment status, problem log) keep their current open,
no-auth behavior. Only the admin surface is gated. No rewrite of existing repository /
service / API layers — the new pieces are additive.

## 5. UI/UX

- Gated `/admin` shell with a sidebar to six panels: **Branding · Images · Layout &
  Board · Scan Actions · QR Codes · Passcode.**
- Matches the navy/gold GFD design system (tokens in `tailwind.config.ts`).
- **`/impeccable` and `/ui-ux-pro-max` (all features) are applied to every admin
  screen** during implementation, per user mandate.
- Live preview where it adds value (e.g. branding changes previewed before save).

## 6. Error handling

- All admin mutations check response `.ok` and surface failures (the app's prior
  silent-swallow bug class is explicitly avoided).
- Settings reads always merge over `DEFAULT_SETTINGS`, so a missing/partial row never
  breaks rendering.
- Image upload validates type and size and reports errors to the user.
- Auth failures return clear messaging; middleware redirects rather than erroring.

## 7. Testing

- `AppSettings` defaults-equal-current-render regression test.
- Settings service + `/api/settings` + `/api/admin/settings` route tests.
- Auth route + middleware guard tests.
- Per-panel page tests (branding, images, layout, scan actions, QR).
- Follows existing vitest per-file convention; target: full suite green (currently
  133/133) plus new coverage.

## 8. Implementation strategy (stages + models)

Built with subagent-driven development (fresh implementer + fresh reviewer per task,
fix-and-re-review loops), plus a final whole-branch review before deploy — the same
process that caught real cross-task bugs in the prior two builds. Models are assigned
to match difficulty to token cost; final per-task assignment is set in the plan.

- **Stage 0 — Foundation** (security- and architecture-sensitive):
  `app_settings` table + `DEFAULT_SETTINGS` + `useAppSettings` + refactor all hardcoded
  values to read from settings (invisible change, regression-tested) + passcode auth
  (table, RLS, route, middleware, entry screen) + admin shell.
  → **Opus** for auth/security and cross-cutting design.
- **Stage 1 — Branding text** → **Sonnet** implement / **Sonnet** review.
- **Stage 2 — Images (Storage)** → **Sonnet** implement / **Opus** review (upload
  security).
- **Stage 3 — Layout & Board** → **Sonnet**.
- **Stage 4 — Scan actions** → **Sonnet**.
- **Stage 5 — Custom QR + labels** → **Sonnet**.
- **Cross-cutting:** **Haiku** for mechanical work (boilerplate, string refactors,
  simple test scaffolds); **Opus** for the final whole-branch review before deploy.
- **UI/UX:** `/impeccable` + `/ui-ux-pro-max` (all features) on every admin screen.

## 9. Deployment note (carried from project state)

The Vercel project's Production Branch does not match `master`, so `git push` deploys to
Preview, not Production. Live deploys currently require a manual `vercel --prod` (or the
user fixing the branch setting at the Vercel dashboard). This is unchanged by this work
but must be remembered when shipping.

## 10. Decisions locked during brainstorming

- Access = **passcode only** (no obscure-URL requirement, no user accounts).
- QR "custom workflows" = **configure which actions show** (config, not a code builder).
- QR creation = **standalone/custom codes + label-appearance control**.
- Layout = **reorder/show-hide sections (dashboard + Board) + Board display tuning**.
- Scan-action granularity = **per item-type with per-item overrides**.
- Passcode = **hashed, in a tightened-RLS table**, changeable from the panel.
- Standalone QR = **points to any URL entered by admin**.
- Images = **size-capped** to respect the free Storage tier.

## 11. Out of scope

- Real per-user authentication / accounts.
- Hardening the permissive RLS on operational tables (tanks/equipment/logs).
- Viewing/restoring soft-deleted (retired) items (pre-existing gap).
- Colors/theme editing and Board view-rotation (considered, not requested).
- A general routing-to-info/SDS scan experience (not selected).
