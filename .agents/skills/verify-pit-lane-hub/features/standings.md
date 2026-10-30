# Standings

`/standings` shows the current driver and constructor championship tables from Jolpica/Ergast.

## Sub-features

- `drivers-table`: driver championship.
- `constructors-table`: constructor championship ("🏎️ Constructor Standings").

## How to get to it (user POV)

- Header "Standings" link, a home page card, or open `/standings`.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/standings` → `drive standings`. Result: the h1 "F1 Standings" and a heading matching /Constructor Standings/ are visible.

## Gotchas

- Upstream API hiccups are logged in `artifacts/verify/server.log` as fetch errors. Check there before blaming the page.
- Do not assert positions or points. They change after every race.
