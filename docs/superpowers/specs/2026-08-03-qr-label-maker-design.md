# QR Label Maker — Design

**Date:** 2026-08-03
**Status:** Approved, ready for implementation plan

## Problem

There is no single place to create an item and produce its QR label, and no way
to print **one** label at a real physical size for a thermal label printer.
Today `/labels` prints the *whole page* as a grid via the browser dialog, with
abstract small/medium/large sizes — fine for a sheet of paper, wrong for a
thermal printer that prints one label at a fixed physical size (e.g. 1"×1").

The user is buying a driver-based thermal label printer and wants: pick the type
of thing from dropdowns → it creates the item and assigns a QR → print that one
label at a chosen size. "Everything could need a code" — the print-one-label
path must also be reachable for every item that already exists.

## Key constraint (why pre-printed stickers were dropped)

Field scanning uses the **native phone camera → app**. For that to work the QR
must encode our URL (`hazmat-tracker.vercel.app/scan/…`). Generic pre-printed
holographic stickers have fixed factory content (a serial like `130515`) and
can't be repointed at our app, so they can't drive a native-camera scan. The
app therefore **generates** the QR and the user prints it on a thermal label.

**Hardware note:** target a **driver-based** thermal printer (Rollo, Munbyn,
Brother QL, Zebra — installs as a normal OS printer, prints via the browser
dialog). Bluetooth-app-only printers (many Niimbot/Phomemo) can't print from a
web app without a custom integration and are out of scope.

## Scope

Covers **both tanks and equipment**, plus the general "Log a Problem" code and
custom standalone codes — anything that already has a QR on `/labels`.

## Surfaces & flow

### New page `/labels/new` — "Label maker"

Public (consistent with the existing public create-on-dashboard flow and the
public `/labels` page — no passcode friction at the printer). Reached by a
**＋ New label** button on `/labels`.

Single form:
1. **Type** — Tank or Equipment (toggle).
2. **Fields / dropdowns** (exactly what the existing create routes require):
   - Equipment → *Category* dropdown (`meter_detector` · `ppe` · `tools_misc`),
     *Name*, *Status* (default `in_service`).
   - Tank → *Gas type*, *Assigned meter*, *PSI*, *Max PSI*, *Status*
     (default `spare`).
3. **Your name** — reused remembered-name pattern (the create API attributes
     every write via `createdBy`).
4. **Create & make label** → `POST /api/equipment` or `POST /api/tanks` →
     returns the new item (with `id`) → generate its QR (the app scan URL) →
     scroll into the single-label print view.

### Single-label print view

Reachable two ways: after create (above), and via a **Print label** button
added to **every card** on `/labels` (each tank, each equipment item, the
general Log-a-Problem code, each custom standalone code).

Contents:
- **Label size** — presets `1"×1"`, `1.5"×1"`, `2"×1"`, `2"×2"`, `4"×6"`, plus a
  **custom W×H** box with an in/mm toggle. Last-used size persisted in
  `localStorage` (no DB).
- Live preview of the one label, reusing existing label settings: optional GFD
  badge (`showLogo`), the QR sized to fit, item name/subtitle, optional
  `footerText`.
- **Print** → inject `@page { size: <W> <H>; margin: 0 }` then `window.print()`,
  with a print-only stylesheet showing only the label. Exactly one
  correctly-sized label is produced. Same `window.print()` + `print:`-CSS
  approach `/labels` already uses; no new dependency.

The `/labels` "Print All" grid is unchanged and remains the sheet-printing path.

## Reuse & new code

**Reused as-is (no new tables, migrations, or API routes):**
- Create: existing `POST /api/equipment`, `POST /api/tanks`.
- QR + URL: existing `QrCode` component + `scanUrl` helpers.
- Badge / footer / logo toggle: existing `useAppSettings` label settings.

**New:**
- `/labels/new` page (the form + post-create hand-off to the print view).
- Single-label print view + size controls.
- `labelSize` pure helper: physical size (preset or custom, in/mm) →
  CSS `@page` size string + QR pixel size.
- `<QrLabel>` component: extract the label-card markup currently inlined in
  `/labels` and reuse it in **both** the grid and the single-label view — remove
  duplication rather than add it.

## Error handling

- Create failure (network/validation) → inline error, do **not** advance to
  print.
- Missing required name → client validation mirroring the API's own required
  checks.
- QR generation failure → `QrCode` already renders a fallback tile.
- Custom size → positive-number bounds (reject zero/negative/absurd values).

## Testing

Matching the existing `*.test.tsx` vitest + testing-library style:
- **Unit:** `labelSize` mapping — presets and custom, in and mm (the one
  non-trivial bit of logic).
- **Component:** `/labels/new` — fill dropdowns, submit calls the correct POST,
  label renders.
- **Component:** a **Print label** button on a `/labels` card opens the sized
  print view.

## Out of scope (YAGNI, revisit later)

- Batch/roll printing of the whole inventory at once (Approach C).
- Predefined equipment-name dropdowns (needs the department's gear list).
- Persisting label size in the DB (localStorage is enough).
- Bluetooth-app-only thermal printers.
