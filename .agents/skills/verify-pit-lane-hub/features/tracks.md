# Tracks (circuits)

`/tracks` has the h1 "<year> circuits" with cards linking to `/tracks/<circuitId>`. A circuit page has an h1 and Layout, 3D, and Map tabs (`role="tab"`, `aria-selected`). Layout is selected by default and draws the outline as an image in the tab panel. Source: `src/app/[lang]/tracks/page.js`, `src/app/[lang]/tracks/[circuitId]/page.js`, `src/components/CircuitPanel.js`, `src/components/Track3D.js`.

## How to get to it (user POV)

- Header "Tracks", then click a circuit card.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive tracks`.

- Open `/tracks`. Result: the h1 matches /circuits$/.
- Click the first `main a[href^="/tracks/"]`. Result: the URL equals that href and the h1 is visible.
- Result: the "Layout" tab has `aria-selected="true"` and the tab panel shows an image.
- Click the "Map" tab. Result: its `aria-selected` becomes `true`.

## Gotchas

- The drive switches to "Map", not "3D". The 3D canvas (WebGL, client-only) is not asserted. Look at `final.png` before making a visual claim.
- A tab click before hydration does nothing. The drive retries until `aria-selected` flips.
- Circuit pages fetch live data. Wait up to 40 s (`visibleSoon`) on a cold compile.
