# Compare drivers

`/compare` ("Driver Comparison") has two driver `<select>`s. Changing one reloads that side's profile (h2 "First **Last**") and career stats from Jolpica. Source: `src/app/compare/page.js`, `src/components/CompareContent.js`. Also linked from the driver page "Compare" button.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive compare`. It selects the last option in the second combobox (retrying until hydrated) and expects an h2 containing that driver's last name.

## Gotchas

- The `<label>`s are not bound to the selects, so select by `getByRole('combobox').nth(i)`.
- If stats fail upstream the page shows "Unable to load data", and the profile heading check fails. Compare that with the server log before calling it a regression.
