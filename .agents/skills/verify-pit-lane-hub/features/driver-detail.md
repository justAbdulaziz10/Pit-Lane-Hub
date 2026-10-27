# Driver detail

`/driver/[number]`: driver hero (h1 name), "Career Statistics", "Recent Results", a "Compare" link, and "← Back to Drivers". Unknown numbers render "Driver Not Found". Source: `src/app/driver/[number]/page.js`, `loading.js`.

## How to get to it (user POV)

- Click a card on `/drivers` (not its star) or a driver on a team page.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive driver-detail`. It clicks the first card on `/drivers`. Result: the URL is that card's href, the h1 and "Career Statistics" are visible, and "Back to Drivers" returns to `/drivers`. `/driver/999` shows "Driver Not Found".

## Gotchas

- The route streams behind `loading.js` ("Loading driver data...") while Jolpica answers. Wait up to 40 s for the h1 (`visibleSoon`). An immediate check sees only the spinner.
- Click the card's heading or image, not the card center, which can be the favorite star.
