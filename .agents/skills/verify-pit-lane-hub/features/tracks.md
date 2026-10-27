# Tracks (3D circuits)

`/tracks` ("F1 Circuits 3D") shows h3 track cards. Clicking one opens a modal with an h2 track name, a Three.js `Track3D` canvas (client-only, `ssr: false`), "🧊 3D Ring" and "🗺️ Map" view buttons, and a "×" close button. Source: `src/app/tracks/page.js`, `src/components/Track3D.js`.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive tracks`. It opens the first card, expects the matching h2, clicks "Map", closes with "×", and expects the modal to be gone.

## Gotchas

- Canvas rendering correctness is not asserted (WebGL in headless Chromium). Look at `final.png` before making a visual claim about the 3D view.
