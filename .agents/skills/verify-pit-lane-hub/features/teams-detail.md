# Teams and team detail

`/teams` has the h1 "<year> Teams" with cards linking to `/team/<teamId>`. A team page has a "<year> drivers" h2 whose links go to `/driver/<driverId>`. Unknown team keys are HTTP 404. Source: `src/app/[lang]/teams/page.js`, `src/app/[lang]/team/[id]/page.js`.

## How to get to it (user POV)

- Header "Teams", then click a team card.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive teams-detail`.

- Open `/teams`. Result: the h1 matches `/^\d{4} Teams$/`.
- Click the first `main a[href^="/team/"]`. Result: the URL equals that href and the h2 "<year> drivers" is visible.
- Click the first `main a[href^="/driver/"]`. Result: the URL equals that href.
- Open `/team/not-a-team`. Result: HTTP 404.

## Gotchas

- Wait for the first team link before reading its href. Cards can load after the heading.
- Team pages fetch live data. Wait up to 40 s (`visibleSoon`) on a cold compile.
