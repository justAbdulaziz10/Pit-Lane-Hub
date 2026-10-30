# Removed F2/F3 page redirects

The F2/F3 page (`/junior`) was removed because its hand-maintained data went stale. Old links redirect permanently to `/standings`. The redirect is in `next.config.mjs` (`/junior` and `/junior/:path*`).

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive junior`. Open `/junior`. Result: HTTP 200 after the redirect and the path is `/standings`.

## Gotchas

- The drive follows the redirect and checks the final status. It does not read the 308 itself.
- The nav no longer has an "F2/F3" link. Do not look for one.
- Do not assert standings content here. `drive standings` owns that.
