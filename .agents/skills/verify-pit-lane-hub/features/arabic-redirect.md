# Legacy Arabic URLs redirect to English

The site is English-only since 2026-10-30. Arabic used to live under `/ar`; those URLs (and `/ar` itself, with any query string) answer a permanent 308 redirect to the matching English URL, for browsers and bots alike. Logic: `resolveLocaleRoute` in `src/lib/i18n/routing.js`, called from `src/proxy.js` (its matcher includes `/ar/:path*`).

## How to get to it (user POV)

- Open an old link such as `/ar/drivers` from a bookmark or search result.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/ar/drivers` → `drive arabic-redirect`. Result: the final path is `/drivers` with HTTP 200.
- Result: `html` has `lang="en"` and no element has `dir="rtl"`.

## Gotchas

- `page.goto` follows the redirect, so the drive checks the final URL. To see the 308 itself: `curl -sI localhost:<port>/ar/teams` shows `location: /teams`.
- `/arx` or other paths that merely start with "ar" are not legacy URLs and must not redirect.
