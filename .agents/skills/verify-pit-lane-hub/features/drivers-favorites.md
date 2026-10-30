# Drivers grid and favourites

`/drivers` lists current-season drivers as cards that link to `/driver/<driverId>`. Each card has a button labelled "Favourite <name>" with `aria-pressed`. A favourite is saved in the browser. It moves to the front only in the "By number" view. The championship order is never reshuffled. Source: `src/app/[lang]/drivers/page.js`, `src/components/DriversGrid.js`, `src/components/FavoriteButton.js`.

## Sub-features

- `grid`: one card per driver, each linking to `/driver/<driverId>`.
- `fav-toggle`: the "Favourite <name>" button toggles `aria-pressed`.
- `fav-persist`: favourites saved in localStorage key `plh:favoriteDrivers` (JSON array).
- `fav-order`: in "By number" view, favourites sort to the front. Other views keep their order.

## How to get to it (user POV)

- Header "Drivers" link, or open `/drivers`.
- Favourite button on any driver card.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline, plus at least 2 drivers returned upstream (the drive fails with the button count otherwise).

- Open `/drivers` → `drive drivers-favorites`. It clears `plh:favoriteDrivers`, reloads, and selects the "By number" button (`aria-pressed="true"`).
- Click "Favourite <name>" on the **last** card. Result: `aria-pressed="true"`, the URL stays `/drivers` (the button does not follow the card link), and localStorage holds one entry.
- Reload and select "By number" again. Result: the first favourite button is the favourited driver and it is still pressed.
- Click it again. Result: localStorage holds `[]` and `aria-pressed="false"`.

## Gotchas

- Favourites lead only "By number". Assert order only in that view.
- SSR renders the unsorted grid. Ordering applies after hydration, so poll rather than reading once.
- A click before hydration does nothing. The drive retries the click until `aria-pressed` flips.
- Favouriting the first card proves nothing about ordering. Always use the last card.
- The drive clears `plh:favoriteDrivers` first. Leftover favourites would make the order check meaningless.
