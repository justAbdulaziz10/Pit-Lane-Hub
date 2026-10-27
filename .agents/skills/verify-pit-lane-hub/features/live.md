# Live Timing

`/live` shows live session positions from OpenF1 during a session. Outside a session it shows an honest "Entry List" instead of a made-up grid.

## Sub-features

- `live-positions`: real positions while a session is running.
- `entry-list`: fallback list when no session is live.

## How to get to it (user POV)

- Header "Live" link (red dot), or open `/live`.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/live` → `drive live`. Result: the heading "Live Timing" and a heading matching /Live Positions|Entry List/ are visible.

## Gotchas

- Outside a race weekend only `entry-list` can be observed. The `live-positions` path stays unproven until a session is running.
