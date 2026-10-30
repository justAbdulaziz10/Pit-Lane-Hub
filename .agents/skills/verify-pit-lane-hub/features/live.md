# Live Timing

`/live` has the h1 "Live timing". During a session it shows positions from OpenF1. Otherwise it shows an honest status heading instead of an invented grid. Locally there are no OpenF1 credentials, so the page shows "Live timing unavailable". Source: `src/app/[lang]/live/page.js`.

## Sub-features

- `live-positions`: real positions while a session is running.
- `status`: a status h2 when positions are unavailable (no session, no credentials, upstream error).

## How to get to it (user POV)

- Header "Live" link, or open `/live`.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/live` → `drive live`. Result: HTTP 200, the h1 "Live timing" is visible, and within 20 s either a `main` h2 (status) or a `main table` (positions) is visible.

## Gotchas

- Without OpenF1 credentials only the status heading can be observed. The `live-positions` path stays unproven until a session runs with credentials.
- The drive accepts any h2 in `main`. It does not check the status text.
