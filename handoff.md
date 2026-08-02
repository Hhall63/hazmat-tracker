# Handoff — HAZMAT Inventory Dashboard

## Project snapshot
Live inventory/status app for Greensboro Fire Department's HAZMAT Team (Engine 11/Ladder 11, Engine 21/Ladder 21, RRT 5). Tracks gas cylinder PSI levels, equipment in/out-of-service status, and a problem-notes log. No login — the link itself is the access control, and every write is attributed via a typed/remembered name only (not verified identity).

- **Local repo:** `C:\Users\ffhal\projects\hazmat-inventory-dashboard` (branch `master` only)
- **GitHub:** https://github.com/Hhall63/hazmat-tracker
- **Live URL:** https://hazmat-tracker.vercel.app/
- **Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, Supabase (Postgres + Realtime for live cross-device sync), `qrcode` npm package for client-side QR generation. PWA-installable (manifest + home-screen icons).
- **Hosting:** Vercel project `hazmat2/hazmat-tracker` (account `hhall63`).

**Three branded surfaces sharing one dark-navy/gold design system:**
1. `/board` — fixed 1080×1920 portrait, view-only, always-on wall-display signage. Auto-density compression shrinks layout tiers only if content would overflow the fixed canvas. Zero interactive elements.
2. **Command Center** (`/`, `/log`, `/labels`) — the full interactive app: live PSI gauges, equipment status toggles, problem log with resolve, tank/equipment add/edit/retire, and `/labels` which generates printable QR labels for every tank/equipment item plus one fixed generic "log a problem" code.
3. **QR quick-action flow** (`/scan/tank/[id]`, `/scan/equipment/[id]`, `/scan/problem`) — scanning a physical label opens a focused single-purpose mobile screen (PSI update with pre-filled stepper, in/out-of-service toggle, log-a-problem, retire). Each scan page has its own "Your name" capture so a first-time phone isn't blocked.

Branding derives from the Greensboro Fire Dept badge (navy/gold/red) and the team's hazmat placard emblem. Color tokens (`bg` #0a1120, `panel`/`panel2`, `gold`/`gold-bright`, `status-red`/`status-amber`/`status-green`, `ink`/`ink-dim`) are defined in `tailwind.config.ts`.

## Current state
- **HEAD:** `8b57897`. The most recent 20 commits are all overhaul/fix work.
- **Tests:** `npm test` → 39 test files, 133 tests, all passing.
- **Uncommitted change:** `git status` shows one — `.gitignore` gained `.vercel` and `.env*` lines, auto-added by running `vercel link` today. Not yet committed or discussed with the user (see Open items #2).
- **Deployment:** the code at HEAD is live, but was pushed via a manual `vercel --prod` run today, NOT via the normal `git push` → auto-deploy flow. See Open items #1 — this matters.

The app was built in two phases, both via superpowers subagent-driven development (fresh implementer + fresh reviewer per task, fix-and-re-review loops, plus a final whole-branch review before each deploy):
- Original build — 19 tasks. Spec `docs/superpowers/specs/2026-07-31-hazmat-inventory-dashboard-design.md`, plan `docs/superpowers/plans/2026-07-31-hazmat-inventory-dashboard.md`.
- Full visual/structural overhaul (the three-surface split, QR flow, branding) — 24 tasks. Spec `docs/superpowers/specs/2026-07-31-hazmat-dashboard-overhaul-design.md`, plan `docs/superpowers/plans/2026-08-01-hazmat-dashboard-overhaul.md`.

The overhaul's final whole-branch review caught two cross-task gaps no single task's review could see, both fixed together in commit `8b57897` before deploy: (1) the QR scan pages had no way to set a name on a first-time device, so every action button stayed permanently disabled — silently defeating the field-use case, because per-task tests all pre-seeded localStorage; (2) `TankControls`/`EquipmentSection`/`AddTankForm`/`AddEquipmentForm` did bare `fetch()` calls with no `.ok` check, silently treating failed saves as successes.

## Key decisions & why
- **No authentication anywhere, by design.** The link is the access control; writes are attributed by typed/remembered name only. An explicit original-spec tradeoff for a small team with no appetite for login friction.
- **Everything commits directly to `master`, no feature branches.** Explicit user consent for this solo project. Don't propose branch/PR workflows unless asked.
- **The Board shows no "all clear" filler when there are no problems.** Silence/absence of the alert banner IS the good-state signal, chosen for glanceability from a distance.
- **QR scan pages retire an item** by transitioning into the same "no longer active" state used for missing/retired items on load, rather than a separate confirmation screen — keeps state handling unified.
- **Vercel CLI (58.4.4) does not expose the "Production Branch" git setting** via `project inspect` or any other subcommand — confirmed. It's dashboard/API-only. Don't hunt for a CLI flag for this again.

## Open items
1. **Vercel Production Branch mismatch — needs the user to fix manually.** The `hazmat-tracker` Vercel project's Production Branch is pointed at something other than `master`. Pushing `master` to GitHub builds successfully but deploys to Preview, not Production — the live site does NOT update from a plain `git push`. Today's deploy was forced live via manual `vercel --prod`. Fix: user visits https://vercel.com/hazmat2/hazmat-tracker/settings/git and sets Production Branch to `master`. Until then, any future push needs a manual `vercel --prod` (or a reminder to the user) to actually go live — don't assume push = deployed.
2. **Uncommitted `.gitignore` change** (`.vercel`, `.env*`, auto-added by `vercel link`). Sitting in the working tree, not yet committed or explicitly approved. Reasonable to commit — these genuinely shouldn't be tracked — but not done yet.
3. **Requested feature, not yet scoped: a backend/admin content-editing page.** User wants to change text and add photos through an admin UI. Interest confirmed today, but scope is undecided (specific fields vs. a general-purpose admin panel). Should go through a brainstorming pass before implementation, same as the overhaul did.
4. **Retired tanks/equipment are fully invisible in the UI** (no way to view soft-deleted items). By design per the original spec, but flagged as a possible future gap if audit visibility ever matters.
5. **Supabase RLS policies are fully permissive** (including DELETE), since there's no auth. Acceptable per the no-login tradeoff; worth hardening if that tradeoff is ever revisited.
6. **`AddTankForm`/`AddEquipmentForm` have no dedicated test files** (matches repo convention — not every component has one). Their save-failure error handling, added in the final fix pass, is correct by inspection but untested.
7. **Cosmetic build warning on every route:** `metadata.themeColor` should move to a separate `viewport` export (Next.js 14.2.5 deprecation notice, non-blocking).

## How to resume
- Verify current live state: `npm test` (should be 133/133), `git log --oneline -10`, and `vercel ls` (already linked to `hazmat2/hazmat-tracker`) to see the deployment list and whether the latest is Production or Preview.
- **Before trusting that a `git push` updated the live site**, check `vercel ls` for a Production-target deployment matching the latest commit — don't assume push means deployed (see Open items #1).
- If picking up the backend content-editing feature: start with brainstorming (which fields/content, general admin panel vs. specific edits, image storage — Supabase Storage is the natural fit) before writing code.
- Full architecture/branding/history detail beyond this summary lives in the two spec docs and two plan docs listed above under Current state, plus `docs/superpowers/handoff-2026-07-31.md` (an older, narrower handoff from just the original 19-task build — superseded in scope by this file, but fine as historical detail).
