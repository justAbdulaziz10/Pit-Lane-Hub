# Custom 404

Unknown routes render the themed "Lost in the gravel trap" page with a real 404 status.

## Sub-features

- `status`: HTTP 404 response.
- `copy`: the themed not-found message.

## How to get to it (user POV)

- Any mistyped or stale URL, for example `/this-route-does-not-exist`.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/this-route-does-not-exist` → `drive not-found`. Result: the response status is 404 and "Lost in the gravel trap" is visible.

## Gotchas

- Dynamic routes such as `/driver/<bad-number>` may render their own empty state instead of the global 404. Do not use them for this check.
