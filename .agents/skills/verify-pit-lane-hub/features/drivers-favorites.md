# Drivers grid and favorites

`/drivers` lists current-season drivers as cards that link to `/driver/<number>`. Each card has a star button. Starring a driver saves it in the browser and moves that card to the front of the grid, and this survives a reload.

## Sub-features

- `grid`: one card per driver, each linking to `/driver/<number>`.
- `fav-toggle`: star button toggles `aria-pressed` and its label ("Add to favorites" / "Remove from favorites").
- `fav-persist`: favorites saved in localStorage key `plh:favoriteDrivers` (JSON array of numbers).
- `fav-order`: favorited drivers sort to the front, in their original relative order.

## How to get to it (user POV)

- Header "Drivers" link, or open `/drivers`.
- Star (☆/★) in the top-right corner of any driver card.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline, plus OpenF1 returning at least 2 drivers (the drive fails clearly with the card count otherwise).

- Open `/drivers` → `drive drivers-favorites`. Result: N ≥ 2 cards `main a[href^="/driver/"]` (22 on 2026-10-27).
- Click "Add to favorites" on the **last** card. Result: its star has `aria-pressed="true"`, the URL stays `/drivers` (the star does not follow the card link), and localStorage holds `[<number>]`.
- Reload. Result: the first card's href is the favorited driver and its star is still pressed.
- Click "Remove from favorites". Result: localStorage holds `[]` and `aria-pressed="false"`.

## Gotchas

- SSR renders the unsorted grid. Ordering applies only after hydration, so poll rather than reading once.
- Favoriting the first card proves nothing about ordering. Always use the last card.
- The drive clears `plh:favoriteDrivers` first. Leftover favorites from a reused context would make the order check meaningless.
