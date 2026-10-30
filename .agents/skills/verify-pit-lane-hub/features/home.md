# Home and primary navigation

Landing page at `/`. The one h1 is visually hidden. The visible cards are "Next race", "Last race", and "<year> drivers" (h2). The header nav links to each section. Source: `src/app/[lang]/page.js`, `src/components/Header.js`.

## Sub-features

- `cards`: "Next race", "Last race", and "<year> drivers" cards render.
- `skip-link`: a "Skip to ..." accessibility link is attached.
- `nav`: header links route to each section.

## How to get to it (user POV)

- Open `/`.
- Click the logo or "Home" in the header from any page.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline (see README).

- Open `/` → `drive home`. Result: HTTP 200 and exactly one h1. The h2 cards "Next race", "Last race", and "<year> drivers" are visible. A link named /Skip to/ is attached.
- Click "Standings" in the header (`header` + `getByRole('link', {name: 'Standings', exact: true}).first()`). Result: URL path is `/standings`.

## Gotchas

- The h1 is visually hidden. Count it with `getByRole('heading', {level: 1})`. Do not wait for it to be visible.
- "Next race" and "Last race" headings may carry extra text, so match the start of the name.
- Scope the nav click to `header`. "Standings" also appears in cards.
- The Next dev overlay badge ("1 Issue") can show in screenshots when an upstream API call errors. It is a dev-only artifact, not a page failure.
