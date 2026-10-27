# Home and primary navigation

Landing page with the "Command Center" hero, the "Explore the Paddock" grid, and the global header nav (Home, Drivers, Teams, Standings, Calendar, History, Tracks, F2/F3, Live).

## Sub-features

- `hero`: "Command Center" hero renders.
- `explore`: "Explore the Paddock" heading and cards.
- `skip-link`: "Skip to main content" accessibility link.
- `nav`: header links route to each section.

## How to get to it (user POV)

- Open `/`.
- Click the logo or "Home" in the header from any page.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline (see README).

- Open `/` → `drive home`. Result: the text "Command Center" and the heading "Explore the Paddock" are visible, and the link "Skip to main content" is attached.
- Click "Standings" in the nav (`getByRole('link', {name: 'Standings'}).first()`). Result: URL path is `/standings`.

## Gotchas

- "Standings" appears more than once (header and cards). Use `.first()`.
- The Next dev overlay badge ("1 Issue") can show in screenshots when an upstream API call errors. It is a dev-only artifact, not a page failure.
