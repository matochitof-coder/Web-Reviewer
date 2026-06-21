---
name: CCN API access pattern
description: How to get data from competitiveclash.network — not Inertia.js, uses HTML scraping + authenticated JSON API
---

# CCN data access pattern

**Why:** The CCN site is Laravel Blade + Alpine.js (not Inertia.js). The `data-page` attribute does not exist. Data comes from two sources.

## JSON API endpoints (require Bearer auth)
- `GET /api/elo-rank` — ELO ranking array with team info
- `GET /api/teams` — all registered teams (some entries have non-string `team_name`, add type guard before `.toLowerCase()`)
- Token is hardcoded in the CCN elo JS bundle (`elo-BoKLbhv5.js`): `4597f448-784d-45ab-8dd0-8a8e4eb9adbb`

## HTML scraping (server-rendered Blade pages)
- `/matches/upcoming` — table rows with `data-id` attribute; date format `DD/Mon/YY HH:MM` UTC
- `/events` — event cards rendered as sections separated by `<h2>Active</h2>` / `<h2>Completed</h2>`

## Non-public endpoints
- `/rank` (season ranking) — content loaded client-side by app.js, use `/api/elo-rank` sorted by `elo_rank_classic` as proxy
- `/teams/:id` profile — no JSON equivalent found; partial HTML parsing works for match rows on team pages

**How to apply:** In `artifacts/api-server/src/routes/ccn.ts` — `ccnApiGet()` for JSON, `ccnHtmlGet()` for HTML, `parseMatchRows()` for table HTML.
