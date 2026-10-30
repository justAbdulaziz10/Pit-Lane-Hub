# History archive

`/history` has the h1 "F1 History", a year `<select name="year">`, and season view links inside `main`. The active view link has `aria-current="page"`. Picking a year puts `?year=<year>` in the URL and shows an h2 "<year> season". The "Drivers" view lists `/driver/<driverId>` links. Source: `src/app/[lang]/history/page.js`, `history-utils.js`.

## How to get to it (user POV)

- Header "History", pick a year, then switch the season view.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive history`.

- Open `/history`. Result: the h1 "F1 History" is visible.
- Select 1988 in `main select[name="year"]`. Result: the URL has `year=1988` and the h2 "1988 season" is visible.
- Click the "Drivers" link in `main`. Result: the `main a[aria-current="page"]` link reads "Drivers", and `main` has at least one `/driver/` link.

## Gotchas

- The select change is dropped if it happens before hydration. The drive re-selects until the URL has `year=1988` (up to 30 s).
- Scope links to `main`. The header has its own "Drivers" link.
- Assert `aria-current`, not styling.
