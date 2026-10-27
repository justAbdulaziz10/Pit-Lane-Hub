# Teams and team detail

`/teams` lists "<year> Team Standings" with cards linking to `/team/<id>`. A team page shows its h1 name, a "Drivers" section linking to `/driver/<n>`, "Recent Results", and "← Back to Teams". Unknown ids render "Team Not Found". Source: `src/app/teams/page.js`, `src/app/team/[id]/page.js`.

## How to get to it (user POV)

- Header "Teams", then click a team card.

## Driving it with scripts/verify-pit-lane-hub.mjs

`drive teams-detail`. It opens `/teams`, clicks the first team, and checks the URL and "Drivers" heading. It then clicks the first team driver and checks that the `/driver/<n>` URL is reached. Finally `/team/not-a-team` shows "Team Not Found".

## Gotchas

- `/teams` is a client component and fetches after hydration, so wait for the first `main a[href^="/team/"]`.
- `/team/[id]` streams behind `loading.js`.
