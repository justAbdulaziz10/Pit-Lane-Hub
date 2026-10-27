# Calendar and race weekend

`/schedule` (header "Calendar") shows "<year> Schedule" with meeting cards linking to `/race/<meeting_key>`. A race page shows the h1 meeting name, "Circuit Location" (a "2D Map" or "3D View" toggle, or "Track map not available" for events such as Pre-Season Testing), "Race Weekend Schedule", and, when the session data exists, "Race Results", "Qualifying", "Tyre Strategy", "Pit Stops", and "Race Highlights". Source: `src/app/schedule/page.js`, `src/app/race/[key]/page.js`.

## How to get to it (user POV)

- Header "Calendar", then click a race.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive calendar-race`. It opens `/schedule` and clicks the first race. Result: the URL matches, and the h1, "Race Weekend Schedule", and "Back to Calendar" are visible.

## Gotchas

- Both routes stream behind `loading.js`. The race page makes several OpenF1 calls, so a cold dev compile can take 20-40 s.
- Results sections depend on data. The drive asserts only the always-present structure.
