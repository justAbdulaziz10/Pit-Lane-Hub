# F2 and F3

`/junior` (header "F2/F3"): "F2 & F3 Racing" with "Formula 2" and "Formula 3" sections, "The Path to F1", and "Live Data Sources". Source: `src/app/junior/page.js`.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive junior`. The h1 and both series headings are visible.

## Gotchas

- "Formula 2" and "Formula 3" each match two headings, so use `.first()`.
