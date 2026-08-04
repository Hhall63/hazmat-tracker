# Handoff — HAZMAT Inventory Dashboard (admin content management)

## Project snapshot

Live inventory/status web app for **Greensboro Fire Department's HAZMAT team** (Engine 21 / Ladder 21 / Hazmat 21/221). Tracks gas-cylinder PSI, equipment in/out-of-service status, and a problem-notes log.

- **Access model:** no user login anywhere — the link *is* the access control; writes are attributed by a typed/remembered name. The one exception is the new `/admin` panel, which is passcode-gated.
- **Stack:** Next.js 14 (App Router, TypeScript), Tailwind, Supabase (Postgres + Realtime + Storage), `qrcode` npm pkg. PWA-installable. Hosted on Vercel.
- **Four surfaces** share one dark navy/gold GFD design system:
  - `/board` — fixed 1080×1920 wall display
  - Command Center — `/`, `/log`, `/labels`
  - QR scan flow — `/scan/tank/[id]`, `/scan/equipment/[id]`, `/scan/problem`
  - `/admin` — passcode-gated content management (the feature this session built)
- **Repo:** `C:\Users\ffhal\projects\hazmat-inventory-dashboard`, branch `master`, direct-to-master (solo project, user consented — do not propose branch/PR workflows).
- **GitHub:** https://github.com/Hhall63/hazmat-tracker · **Live:** https://hazmat-tracker.vercel.app (admin at `/admin`)
- **Supabase project ref:** `rdapfauvbukljyojknfq` · **Vercel:** project `hazmat2/hazmat-tracker` (account hhall63)
- **Key docs:** `docs/admin-setup.md` (one-time DB/env setup), `docs/superpowers/plans/2026-08-02-hazmat-admin-content-management.md` (admin plan, 5 stages), plus older overhaul/original specs under `docs/superpowers/`.

## Current state

**The admin content-management feature is fully built, merged to `master`, deployed to production, and verified live.** There is no in-flight work.

- HEAD = `baeb82c`. `master` and `origin/master` in sync (0 ahead). Working tree clean.
- Tests: `npm test` → 63 files, **198 passing**. `npm run build` exits 0, clean (no prerender errors).
- The `admin-content-mgmt` worktree/branch was fast-forward-merged into `master` and pushed; the worktree can be removed when convenient.

Admin panels under `/admin` (all passcode-gated via signed-cookie middleware keyed by `ADMIN_SESSION_SECRET`):
- **Branding text** · **Images** (Supabase Storage uploads to `branding` bucket) · **Layout & Board** (reorder/show-hide sections + Board density) · **Scan actions** (toggle which buttons show on scan screens) · **QR codes & labels** (custom standalone QR codes + label size/logo/footer) · **Change passcode**
- Dashboard/Board/scan/labels pages read config from `app_settings` via the `useAppSettings` hook; admin writes go through service-role-key routes.

Infrastructure provisioned:
- **Supabase DB:** migrations 0002–0005 applied live (`app_settings`, `admin_config`, `custom_qr_codes` tables + public-read `branding` storage bucket).
- **Vercel env vars** set (Production + Preview) and mirrored to local `.env.local`: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET` (`=7ee099e1a7fe30fe022542988a73aa87e0d1283c640b98b3c75e74dcf6d898cc`).
- A temporary admin passcode `gfd27dfc165` was seeded into `admin_config` (scrypt salt:hash). User was told to change it in the admin Passcode panel.

## Key decisions & why

- **`export const dynamic = 'force-dynamic'` is REQUIRED on every GET route that reads the DB.** Without it Next.js statically prerenders the route and serves build-time data — admin saves and live tank/equipment realtime sync silently never appear. Commit `baeb82c` added it to `/api/settings`, `/api/tanks`, `/api/equipment`, `/api/logs`, `/api/custom-qr`. **Any new live-data GET route must have it.**
- **Never export non-handlers from a Next.js `route.ts`.** Route modules may only export HTTP handlers + route config; anything else breaks `npm run build`. `validateUpload` lives in a sibling `upload/validate.ts` for this reason; a stray `ADMIN_COOKIE` export in `api/admin/auth/route.ts` broke the build and was demoted to a local const (commit `0e05cea`).
- **All 5 admin stages were built.** A YAGNI pass flagged stages 3–5 (layout/board config, scan-action toggles, custom QR/labels) as beyond the stated "change text + upload photos" need — the user explicitly chose all 5.
- **DB migrations and env-var setup were done via REST APIs, not CLIs.** `supabase login` / `vercel login` can't complete in this non-TTY harness, so migrations went through the Supabase Management API (Personal Access Token) and Vercel env vars through the Vercel REST API. Tokens (`SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`) live in the worktree `.env.local` (gitignored).
- **Labels `showLogo` defaults ON** — printed labels now include the GFD badge (a deviation from the previous bare labels). Toggleable off in the QR admin panel.
- **Production deploys need explicit per-deploy user authorization** naming the Vercel production target — a generic "go" is blocked by the auto-mode classifier. `vercel --prod` is the deploy command (org `team_Ng9Dajl2jgAKv8KxAtBhSojw`, project `prj_eJq89vqFlrQ6DswVpel39ZK55EpK`).

## Open items

- **④ Vercel "Production Branch" is still NOT set to `master`** — the single remaining manual task. Dashboard-only setting; cannot be changed via CLI/API (confirmed). Consequence: a plain `git push` deploys to **Preview**, not production; production updates require a manual `vercel --prod`. User must fix at https://vercel.com/hazmat2/hazmat-tracker/settings/git
- **Temp admin passcode `gfd27dfc165` should be changed** by the user in `/admin` → Passcode panel. Unknown whether done.
- **`showLogo` label default** — open question whether the user wants it flipped to off.
- Pre-existing (still true, by design): retired tanks/equipment are invisible in the UI; Supabase RLS policies are fully permissive including DELETE (acceptable given the no-login tradeoff).
- Minor: harmless untracked scratch files `test_pass_output.txt` / `test_fail_output.txt` and `.vercel/` in the main checkout.

## How to resume

The feature is shipped and live; nothing is in flight. Sanity checks:
- `npm test` → expect 198 passing.
- `curl https://hazmat-tracker.vercel.app/api/settings` → should reflect the saved admin config.

To deploy after any change (get explicit production authorization from the user first):
```
vercel --prod --token "$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2-)"
```
(org/project IDs above).

If extending the admin panel: read `docs/superpowers/plans/2026-08-02-hazmat-admin-content-management.md` and `docs/admin-setup.md`. Remember the two hard rules: **`force-dynamic` on any new live-data GET route**, and **never export non-handlers from a `route.ts`**.
