# Driver detail

`/driver/<driverId>` (for example `/driver/hamilton`): h1 driver name, a "Career" h2, and results. Legacy number URLs redirect to the driverId URL. Unknown keys are HTTP 404 with the "Page not found" page. Source: `src/app/[lang]/driver/[number]/page.js`, `driver-path.js`, `driver-data.js`.

## How to get to it (user POV)

- Click a card on `/drivers` (not its favourite button) or a driver on a team or standings page.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive driver-detail`.

- Open `/drivers` and click the first `main a[href^="/driver/"]`. Result: the URL equals that href, the h1 is visible, and the h2 "Career" is visible.
- Open `/driver/44`. Result: the path becomes `/driver/hamilton`.
- Open `/driver/999`. Result: HTTP 404 and the heading "Page not found".

## Gotchas

- The page fetches live Jolpica data. Wait up to 40 s for the h1 and "Career" (`visibleSoon`), especially on a cold dev compile.
- The route folder is still named `[number]`, but the URL key is the driverId.
- Click the card link, not the card center. The center can be the favourite button.
- The `/driver/44` redirect is a fixed pair (44 to hamilton). A data change that renames the driverId breaks it.
