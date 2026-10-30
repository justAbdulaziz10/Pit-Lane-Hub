# Calendar and race weekend

`/schedule` (header "Calendar") has the h1 "<year> F1 Calendar", a `webcal://` subscribe link, and race cards linking to `/race/<year>-<round>`. A race page has an h1 and a "Weekend schedule" h2. Pre-1950 or unknown keys are HTTP 404. Source: `src/app/[lang]/schedule/page.js`, `src/app/[lang]/race/[key]/page.js`.

## How to get to it (user POV)

- Header "Calendar", then click a race.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive calendar-race`.

- Open `/schedule`. Result: the h1 matches /F1 Calendar/ and at least one `main a[href^="webcal://"]` exists.
- Take the first `main a[href^="/race/"]`. Result: the href matches `/race/<year>-<round>` (`^/race/\d{4}-\d{1,2}$`). Click it and the URL equals that href.
- Race page. Result: the h1 and the h2 "Weekend schedule" are visible.
- Open `/race/1949-1`. Result: HTTP 404.

## Gotchas

- `/schedule` streams behind `loading.js`. Use `visibleSoon` (40 s) for the first heading, because an immediate check sees only the loading state.
- The race page makes several upstream calls. A cold dev compile can take 20-40 s.
- Results sections depend on data. The drive asserts only the always-present structure.
- The old `meeting_key` URLs are gone. Keys are `<year>-<round>`.
