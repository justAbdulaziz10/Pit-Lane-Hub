# History archive

`/history` ("Historical Data") has season buttons (4-digit years) and a View toggle ("🏁 Races" or "🏎️ Drivers"). The Races view shows h3 meeting cards. The Drivers view shows h4 driver cards. An empty season shows "No data available". Source: `src/app/history/page.js` (client, OpenF1).

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive history`. It clicks the second season button and expects a real race h3 (not "No data available"). It then clicks "Drivers" and expects at least one h4 driver card.

## Gotchas

- The active state is a hashed CSS class, so assert content, not the button style.
- Wait for "Loading <year> data..." to disappear before reading.
