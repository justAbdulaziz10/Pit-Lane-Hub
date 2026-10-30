# Pit Lane Hub feature map

The user-facing features of the public site and how to drive each one through `scripts/verify-pit-lane-hub.mjs`.

| Feature | File | Drive |
|---|---|---|
| Home and primary navigation | [home.md](home.md) | `drive home` |
| Drivers grid and favorites | [drivers-favorites.md](drivers-favorites.md) | `drive drivers-favorites` |
| Standings | [standings.md](standings.md) | `drive standings` |
| Live Timing | [live.md](live.md) | `drive live` |
| Driver detail | [driver-detail.md](driver-detail.md) | `drive driver-detail` |
| Teams and team detail | [teams-detail.md](teams-detail.md) | `drive teams-detail` |
| Calendar and race weekend | [calendar-race.md](calendar-race.md) | `drive calendar-race` |
| Compare drivers | [compare.md](compare.md) | `drive compare` |
| History archive | [history.md](history.md) | `drive history` |
| Tracks (3D) | [tracks.md](tracks.md) | `drive tracks` |
| F2 and F3 | [junior.md](junior.md) | `drive junior` |
| Account and support pages (render only) | [auth-pages.md](auth-pages.md) | `drive auth-pages` |
| Custom 404 | [not-found.md](not-found.md) | `drive not-found` |

## Baseline preconditions

- `npm ci` done, Playwright chromium installed, internet reachable (OpenF1 and Jolpica feed the pages).
- `scripts/verify-pit-lane-hub.mjs launch` returned ok and `doctor` is ok.
- Each drive gets a fresh browser context, so localStorage starts empty.

## Driving conventions

- Select by accessible role and name or by route href (`main a[href^="/driver/"]`), never by CSS class or coordinates. CSS-module class names are hashed.
- Poll for state after SSR because client components hydrate late. A click before hydration does nothing.
- `/schedule`, `/driver/*`, `/team/*`, and `/race/*` stream behind `loading.js`. Use `visibleSoon` (40 s) for their first content check.
- Every drive states its expected result and fails on a mismatch.

## Proof rules

Capture the action and the resulting state (`result.json` steps and `final.png`). For persistence, read back storage and reload. Do not claim live-data correctness: the APIs change week to week. Assert structure and behavior instead.
