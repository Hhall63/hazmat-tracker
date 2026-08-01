# HAZMAT Dashboard Overhaul — Design

## Purpose

The current dashboard (see `2026-07-31-hazmat-inventory-dashboard-design.md`)
is functionally complete but visually unstyled — default Tailwind, no color
system, no layout intention. It also treats "wall display" and "phone/laptop
editing" as one undifferentiated responsive page.

This overhaul is a full visual and structural redesign, branded for
Greensboro Fire Department's HAZMAT Team (Engine 11/Ladder 11, Engine
21/Ladder 21, RRT 5), and splits the single page into three purpose-built
surfaces that better match how the team actually uses it: a dedicated
always-on wall display, an interactive management app, and a QR-driven quick
action flow for phones.

Primary driver: **glanceability of problems** — someone walking past the wall
display should see within two seconds whether anything is wrong. Secondary:
**frictionless data entry** — updating a tank or piece of equipment from a
phone should take as few taps as physically possible.

## Scope

Full redesign of the existing dashboard's presentation and information
architecture. No changes to the underlying data model beyond what's needed to
support QR scan routing (none required — existing IDs are reused). Explicitly
in scope:

- Branded visual system (color, type, motion) across all surfaces
- A dedicated `/board` route built for a fixed 1080×1920 portrait display
- A redesigned interactive app (`/`, `/log`) for desktop/tablet/phone-without-a-QR
- A QR-code-driven quick action flow for phones (`/scan/...`)
- QR label generation/printing for tanks, equipment, and a generic "log a
  problem" label

Out of scope: any change to what data is tracked (tanks, equipment,
problems, log) or the underlying Supabase schema — see
[Data model](#data-model) for the one small addition.

## Branding

Assets: `C:\Users\ffhal\Downloads\GFD-removebg-preview.png` (department
badge — navy, gold, red) and `C:\Users\ffhal\Downloads\11 & 21.png` (team
emblem — hazmat placard colors). See memory
`project_hazmat_inventory_dashboard_branding` for full detail.

**Color tokens:**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a1120` | App background (near-black navy) |
| `--panel` | `#10192d` | Card/panel background |
| `--panel-2` | `#16223b` | Nested panel background |
| `--border` | `rgba(205,163,73,0.20)` | Default hairline border (gold-tinted) |
| `--gold` | `#cda349` | Header rule, section labels, primary accent |
| `--gold-bright` | `#e6c479` | Header title text |
| `--red` | `#d21f3c` | Critical status (problems, low PSI, out of service) |
| `--amber` | `#f2b705` | Caution status |
| `--green` | `#34d399` | Good/nominal status |
| `--text` | `#eef2f7` | Primary text |
| `--text-dim` | `#92a1b8` | Secondary/meta text |

**Typography:** a geometric sans (Inter or IBM Plex Sans) for UI text and
labels, paired with a monospace numeric face (IBM Plex Mono or JetBrains
Mono) specifically for PSI readouts and stat-bar numbers — reinforces an
instrument-panel feel and keeps numbers scannable at a distance on the board.

**Motion:** functional, not decorative. Gauge needles animate on value
change; a value briefly highlights when it updates via realtime sync so
someone watching the board notices *what* changed; status-color transitions
run 150–250ms. All motion respects `prefers-reduced-motion`.

**Logo usage:** GFD badge appears in the header on all three surfaces
(board, Command Center, scan screens), full brand colors carried throughout
rather than used as a subtle accent only.

## Architecture: three surfaces

| Surface | Route(s) | Interactivity | Device |
|---|---|---|---|
| **Board** | `/board` | None — pure display | Wall-mounted 1080×1920 portrait monitor |
| **Command Center** | `/`, `/log`, `/labels` | Full CRUD | Desktop, tablet, phone (fallback) |
| **Quick Action** | `/scan/tank/[id]`, `/scan/equipment/[id]`, `/scan/problem` | Single-purpose form | Phone, reached via QR scan |

All three read from the same tank/equipment/log_entries data via the
existing repository layer and share one component/token library. They
differ in interactivity and information density, not in visual identity.

## Board (`/board`)

Fixed 1080×1920 canvas, no scrolling, no interactive elements. Top to
bottom:

1. Header — GFD crest, "HAZMAT Inventory", team line, compact sizing
2. Stat bar — three tiles: Open Problems, Tanks Low, Equipment In-Service
3. Alert banner — rendered only when an unresolved problem exists; the
   board shows no "all clear" filler when there isn't one, so absence of
   the banner itself is the good-state signal
4. Cylinders section — gauge grid (redesigned gauge: thicker arc with
   visible red/amber/green zones, bold numeric PSI readout)
5. Equipment section — status rows grouped by category, in/out-of-service
   chip

**Auto-density (compress only when needed):** the board renders at a
"comfortable" default density first, matching today's item counts (~6
tanks, ~12 equipment). After mount, it measures its own rendered content
height against the fixed 1920px canvas via a `ResizeObserver`/measurement
hook. If content overflows, it steps down through density tiers
(`comfortable` → `compact` → `dense` — smaller card padding, tighter grid,
smaller type) and re-measures, stopping at the first tier that fits. This
is a real runtime measurement loop so the board keeps working as-is as the
team's inventory grows, rather than a fixed breakpoint tuned to today's
counts.

Live updates via the existing `useRealtimeRefetch` hook — no polling.

## Command Center (`/`, `/log`, `/labels`)

Same visual structure and components as the Board, but interactive:

- Tank gauge cards open an edit view (update PSI, reassign meter, retire)
- Equipment rows support a one-tap in/out-of-service toggle, plus a full
  edit view
- "Add Tank" / "Add Equipment" actions in each section header
- New `/labels` page: lists every active tank and equipment item with a
  "Print Label" action per item, plus the fixed generic "Log a Problem"
  label; a "Print All" option lays every current label out on one sheet
  sized for standard label stock
- `/log` gets the same visual treatment (dark theme, gold accents) with its
  existing table/resolve functionality unchanged
- Responsive: the two-column grid (cylinders | equipment) collapses to a
  stacked single column below tablet width, so this is also the fallback
  experience for anyone opening the site on a phone without scanning
  anything

## Quick Action flow (`/scan/...`)

Each tank and equipment item's existing ID is reused as the scan target —
no new identifiers. Type is encoded in the URL path so lookup is
unambiguous (no cross-table ID collision risk):

- **`/scan/tank/[id]`** — current PSI and status shown large. Primary
  action: **Update PSI**, a numeric input with large +/- steppers,
  pre-filled with the current value. Secondary, less prominent actions:
  "Log a problem with this tank", "Retire".
- **`/scan/equipment/[id]`** — current status shown large. Primary action:
  one-tap **in-service / out-of-service** toggle. Same secondary actions as
  above.
- **`/scan/problem`** — the generic, not-item-specific problem form, for
  the one fixed label posted somewhere general. Manually logging a problem
  through Command Center's existing `NewProblemForm` remains available too
  — QR scanning is the fast path, not the only path.

**Memory/persistence (ease of use is the explicit priority here):**

- Name is stored permanently in `localStorage`, no expiry — extends the
  existing `useLocalName` hook so it's asked once per device, ever, not
  per session
- Every quick-action form pre-fills with the item's last-known value so the
  user edits a delta rather than re-entering everything
- A PWA manifest + icons are added so the app can be added to the home
  screen after first scan, behaving like an installed app rather than a
  bookmark on repeat visits

## Data model

No schema changes to existing tables. QR codes encode the item's existing
`id` directly into the scan URL — the ID space doesn't need a shared
namespace across tanks and equipment because the URL path itself carries
the type (`/scan/tank/<id>` vs `/scan/equipment/<id>`).

QR images are generated client-side at render/print time (a small library
such as `qrcode`, no external API call, no stored QR image data) — always
derived fresh from the item's ID, so there's nothing to keep in sync if an
ID changes (it never does — IDs are immutable) or a label needs reprinting.

## Error handling / edge cases

- `/scan/tank/[id]` or `/scan/equipment/[id]` for a retired or nonexistent
  ID (old label, item since retired): show a clear "this item is no longer
  active" state rather than a blank/broken form.
- Board auto-density measurement: if content still overflows at the
  densest tier (unexpectedly large inventory growth), fall back to that
  densest tier rather than looping indefinitely — this is a future scaling
  concern to revisit if it happens, not solved now.
- Same realtime-drop and concurrent-edit handling as the current app
  (fetch-on-load fallback, last-write-wins) — unchanged by this redesign.

## Testing approach

Consistent with the existing `*.test.ts`/`*.test.tsx`-alongside-source
pattern:

- Density-tier selection logic (given content height vs. viewport, which
  tier is chosen) is a pure function, unit tested directly.
- Scan route resolution (valid tank ID, valid equipment ID, retired ID,
  nonexistent ID) is tested at the route/component level.
- QR label generation is tested for correct URL encoding per item type.
- Manual end-to-end pass in a browser: board renders correctly at
  1080×1920 with today's item counts and with a simulated larger inventory
  (to exercise density compression), a scanned tank/equipment URL opens the
  correct quick-action screen, and a printed label's QR resolves to the
  right item.

## Explicitly out of scope (for this iteration)

- Any change to tracked data fields, categories, or the underlying schema
  beyond what's described above.
- Filtering/search across tanks or equipment.
- Visibility into retired/soft-deleted items in any UI.
- Multi-station support, user accounts, or automated sensor PSI feeds
  (all already out of scope per the original design doc and unchanged
  here).
