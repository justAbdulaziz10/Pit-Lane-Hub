# Standings

`/standings` shows the current driver and constructor championship tables from Jolpica/Ergast. The h1 is "<year> Standings". Rows link to `/driver/<driverId>` and `/team/<teamId>`. Source: `src/app/[lang]/standings/page.js`.

## Sub-features

- `drivers-table`: driver championship with driver links.
- `constructors-table`: constructor championship with team links.

## How to get to it (user POV)

- Header "Standings" link, a home page card, or open `/standings`.
- The old `/junior` URL also lands here (see [junior.md](junior.md)).

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/standings` → `drive standings`. Result: the h1 matches `/^\d{4} Standings$/`, and `main` holds at least one `a[href^="/driver/"]` and one `a[href^="/team/"]`.

## Gotchas

- Upstream API hiccups are logged in `artifacts/verify/server.log` as fetch errors. Check there before blaming the page.
- Do not assert positions or points. They change after every race.
