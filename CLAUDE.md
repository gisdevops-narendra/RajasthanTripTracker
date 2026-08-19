# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page trip expense/sightseeing tracker for a Rajasthan trip, backed by a Google Sheet via Google Apps Script. No build system, no package manager, no test runner — this is two files that get pasted directly into their hosting environments:

- `index.html` — the entire frontend: Bootstrap 5 (CDN) + vanilla JS, no framework, no bundler.
- `Code.gs` — the entire backend: a Google Apps Script Web App that reads/writes a Google Sheet and responds via JSONP.
- `backupCode.gs`, `backupCode1Code.gs` — manual point-in-time snapshots of `Code.gs`, kept as personal backups, not loaded by anything. When editing backend logic, edit `Code.gs`; don't bother syncing the backups.

There is no local dev server, linter, test suite, or build step. "Running" the app means deploying both halves and opening the HTML in a browser (see next section).

## Deploying / testing changes

1. **Backend (`Code.gs`)**: paste into a Google Sheet's Extensions → Apps Script editor, save, then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone). Copy the resulting Web App URL into `API_URL` in `index.html` (currently set at `index.html:1645`).
2. **Frontend (`index.html`)**: just open the file in a browser (or serve it statically) — no build step required.
3. The Apps Script backend auto-creates its own sheets (`Days`, `Places`, `FoodBills`) on first call via `setupSheets()`; there's no separate schema/migration step.

There's no automated test suite. Verify changes by exercising the UI in a browser against a real (or test) Google Sheet deployment.

## Architecture

### Data model
Three entities, mirrored 1:1 between the Sheets tabs and the in-memory JS `data` object:
- **Days** (`Days` sheet) — `id`, `name`.
- **Places** (`Places` sheet) — sightseeing locations under a day, with a per-person cost split (`costs[personId]`) and a `paidBy` field. `PEOPLE_IDS` (`Code.gs:28`) / `PEOPLE` (`index.html:1649`) is the fixed roster of 7 travelers — these two lists must stay in sync since the sheet columns are positional (`rowToPlace` reads columns 9 onward by `PEOPLE_IDS` index).
- **FoodBills** (`FoodBills` sheet) — restaurant/food expenses under a day, with `amount`, `paidBy`, `paymentStatus`, `category`.

`data.days[]` in the frontend nests `places[]` and `foodBills[]` under each day — this is the shape `readAll()` in `Code.gs` reconstructs from the three flat sheets on every load.

### Frontend ↔ backend transport
There is no CORS/JSON API — the frontend talks to Apps Script exclusively via **JSONP** (`apiCall()` in `index.html`, ~line 1903): it injects a `<script>` tag pointing at `API_URL?action=...&callback=...&payload=<base64 JSON>`, and the Apps Script response is `callback({...});` executed as JS. This is why:
- All backend responses go through `jsonp()` in `Code.gs`, which whitelists the callback name against a strict regex (`safeCallback`) to prevent injection.
- Payloads are base64-encoded JSON in a `payload` query param (`Code.gs:36-38`), not a POST body.
- Every `doGet` action (`read`, `saveDay`, `savePlace`, `deletePlace`, `saveFoodBill`, `deleteFoodBill`, `reset`, `bulkSaveAll`, `bulkSavePlaces`) is a plain GET, dispatched via a switch in `Code.gs:42`.

### Sync model
The frontend is optimistic and local-first within a session: `data` is mutated in memory immediately on user action, `render()` is called synchronously, and the corresponding `cloudSave*`/`cloudDelete*` call fires async afterward (see e.g. `updateCost`/`cloudSavePlace` around `index.html:2166`). Cloud failures just flip the status toast to red ("Changed locally; cloud save failed") — they don't roll back local state or retry automatically. On load, `refreshFromCloud()` (`index.html:1991`) pulls the full sheet, reconciles it against `INITIAL_DAYS`/`ORIGINAL_COSTS` defaults (`normalizeData()`, `reconcileFoodBillDays()`), and pushes any newly-added days/moved bills back to the sheet.

`bulkSaveAll`/`bulkSavePlaces`/`writeSheetBulk` exist specifically to replace many individual `appendRow`/`getRange` round-trips (slow) with one `setValues()` per sheet — used for first-time upload and "Reset Trip". Preserve this batching if you touch bulk write paths.

There is **no localStorage persistence of trip data** — only UI prefs (`rtt_theme`, `rtt_activeTab`) are cached locally. Trip data is always sourced fresh from the Google Sheet on load; if `API_URL` still contains `PASTE_YOUR` (unset), the app falls back to local-only `INITIAL_DAYS` data with no cloud sync.

### Day/date logic
`TRIP_START_DATE` and `TRIP_DAY_COUNT` (`index.html:1729`) anchor day IDs (`day-1`, `day-2`, ...) to real calendar dates, used to auto-select "today's" day in filters (`getAutoDayId`, `getTodayDayId`) and to auto-assign food bills to the correct day when their date is edited (`reconcileFoodBillDays`, `getDayIdForDateString`). Update `TRIP_START_DATE`/`TRIP_DAY_COUNT` if the trip dates change.

### Frontend structure within `index.html`
- First `<script>` block (~line 1325): theme picker only (`THEMES`, `applyTheme`), independent of the data/sync logic.
- Second `<script>` block (~line 1639 to end): everything else — config constants, data model, sync (`apiCall`/`cloudSave*`/`cloudDelete*`), rendering (`render()` → `renderSightseeing()`/`renderFood()`, each with separate desktop/mobile row renderers), and modal/UI helpers (custom confirm/prompt modals replace native `confirm()`/`prompt()`, since those don't work well in the WebView/iframe contexts this is used in).
- `DATA_VERSION` (`index.html:1647`) exists for future migration guarding but isn't currently branched on beyond being stamped onto `data`.
