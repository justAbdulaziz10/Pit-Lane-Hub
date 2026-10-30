# Compare drivers

`/compare` has the h1 "Compare drivers" and two comboboxes named "Search any driver since 1950". Typing lists matching drivers as options. Picking one loads that side's profile (h2 with the driver name) and career stats. Source: `src/app/[lang]/compare/page.js`, `src/components/CompareContent.js`. Also linked from driver pages.

## How to get to it (user POV)

- Open `/compare`, or use the compare link on a driver page.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive compare`.

- Open `/compare`. Result: the h1 "Compare drivers" is visible.
- Type "Senna" into the second combobox (`getByRole('combobox', {name: 'Search any driver since 1950'}).nth(1)`). Result: an option matching /Ayrton Senna/ appears.
- Click the option. Result: an h2 named "Ayrton Senna" is visible.

## Gotchas

- Both comboboxes share one name. Pick the side with `.nth(i)`.
- Typing before hydration is reverted by React. The drive refills and retypes until the option shows (up to 30 s).
- Type with `pressSequentially` and a small delay. `fill` alone does not trigger the search reliably.
- If the upstream lookup fails, no option appears. Compare with `artifacts/verify/server.log` before calling it a regression.
