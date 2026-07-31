# Hazmat Inventory Dashboard — Design

## Purpose

A hazmat team currently tracks equipment and calibration-gas cylinders with no
formal system (tribal knowledge only). This project builds a small web
dashboard so anyone on any shift can see, at a glance, what gear is in
service, how much gas is left in the cylinders currently in use, and how many
spares are on hand — plus a running log for accountability.

Primary driver: **operational awareness** (what do we have, where, is it
ready to use). Secondary: **accountability/audit trail** (who changed what,
when).

## Scope

- Single station, single cache of equipment (not multi-location).
- No user accounts. The link itself is the access control — anyone with it
  can view and edit. Each edit requires the person to type their name, which
  is attributed in the log.
- Accessed both via a shared wall-mounted display (always-on, view-only in
  practice) and individual devices (phones/laptops) for making updates.
- Must be reachable from the public internet (not tied to the station's
  internal network), given city network restrictions.

## Architecture

- **Next.js** app — one codebase serving both the UI and backend API routes.
- **Vercel** (free tier) for hosting — gives a public HTTPS URL with no
  server maintenance.
- **Supabase** (free tier Postgres) for data storage. Supabase Realtime
  pushes live updates to all connected clients, so the wall display and any
  phone/laptop editing stay in sync without polling or manual refresh.
- No authentication layer. Every write action includes a required "name"
  field, used purely for attribution in the log — not verified identity.

## Data model

**tanks**
- `id`
- `gas_type` (text)
- `assigned_meter` (text, nullable — which instrument it's paired with, if in use)
- `psi` (integer)
- `status` (`in_use` | `spare` | `retired`)
- `last_updated_by` (text)
- `last_updated_at` (timestamp)

**equipment_items**
- `id`
- `name` (text)
- `category` (`meter_detector` | `ppe` | `tools_misc`)
- `status` (`in_service` | `out_of_service` | `retired`)
- `last_updated_by` (text)
- `last_updated_at` (timestamp)

**log_entries**
- `id`
- `created_at` (timestamp)
- `created_by` (text)
- `entry_type` (`tank_update` | `equipment_status_change` | `problem_note`)
- `description` (text — human-readable summary of what changed, or the
  free-text problem note itself)
- `resolved` (boolean, nullable — only meaningful for `problem_note` entries)

Every tank PSI/status update and every equipment status flip inserts a
`log_entries` row automatically. Problem notes are entered directly as
`log_entries` rows by a team member.

"Retired" tanks/equipment are a soft-delete: they stop appearing in the
active dashboard views but remain in the database so log history referencing
them stays intact.

## Pages

### Dashboard (`/`)

- **Tank gauges**: one visual PSI gauge per `in_use` tank, labeled with gas
  type and assigned meter. Gauge color shifts green → yellow → red as PSI
  drops toward empty (exact thresholds to be tuned once real cylinder specs
  are known). A simple count of `spare` tanks displayed alongside.
- **Equipment status**: items grouped by category (meters/detectors, PPE,
  tools & misc), each shown with a red/green in-service indicator, toggleable
  inline.
- **Problems**: shows only the most recent unresolved `problem_note` entry
  (or entries), each with a small footnote of who logged it and when (e.g.
  "— J. Smith, Jul 30"). Full history lives on the Log page.
- Responsive layout: legible at a glance on a wall-mounted monitor, usable
  for editing on a phone screen.
- All sections update live via Supabase Realtime when anyone else makes a
  change.

### Log (`/log`)

- Reverse-chronological list of every `log_entries` row: tank updates,
  equipment status changes, and problem notes, each showing who/when/what.
- Problem notes can be marked resolved from this page (stays visible in
  history rather than being deleted).

### Item management

- Tanks and equipment items are added/edited through the UI itself (not
  hardcoded/seeded in migrations), since the real inventory doesn't exist in
  the system yet. This lets the team populate their actual gear without any
  code changes.

## Error handling / edge cases

- If a Supabase Realtime subscription drops, the client falls back to
  fetching fresh data on next page load — the dashboard should never show
  silently stale data beyond a normal page load's staleness.
- Retiring a tank or equipment item never hard-deletes it, preserving log
  integrity.
- Concurrent edits: last write wins (acceptable given no login and small
  team size — conflicting simultaneous edits are expected to be rare).

## Testing approach

Given the small scope and no-auth simplicity:
- Data-layer tests: creating/updating tanks and equipment items produces the
  correct `log_entries` rows.
- Manual end-to-end pass in a browser: dashboard reflects edits correctly,
  log records everything, and realtime sync is verified across two
  simultaneously open tabs (simulating wall display + phone).

## Explicitly out of scope (for this iteration)

- User accounts / individual logins.
- Automated sensor/IoT PSI feeds (manual entry only).
- Multi-station/multi-location support.
- Reorder/procurement workflows beyond the spare-tank count and
  out-of-service flags already covered.
