# Custom 404

Unknown routes render the themed page with the h1 "Page not found" and a real HTTP 404. Unknown driver, team, and race keys use the same page. Source: `src/app/[lang]/not-found.js`, `src/app/[lang]/[...missing]/page.js`.

## Sub-features

- `status`: HTTP 404 response.
- `copy`: the h1 "Page not found".

## How to get to it (user POV)

- Any mistyped or stale URL, for example `/this-route-does-not-exist`.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/this-route-does-not-exist` → `drive not-found`. Result: HTTP 404 and the h1 "Page not found" is visible.
- Unknown keys are also 404, and are checked in other drives: `/driver/999` (`driver-detail`), `/team/not-a-team` (`teams-detail`), `/race/1949-1` (`calendar-race`).

## Gotchas

- Use a plain path for the global check. Dynamic routes have their own checks above.
