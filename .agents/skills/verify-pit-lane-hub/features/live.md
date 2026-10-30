# Live Timing

`/live` names the latest OpenF1 session in its h1 (for example "United States Grand Prix · Race") with its timing table and race control. Finished sessions load without credentials. With no session, or when OpenF1 locks anonymous access during a running session, the h1 reads "Live timing" and a status heading ("No session running" / "Live timing unavailable") replaces the grid. Source: `src/app/[lang]/live/page.js`.

## Sub-features

- `live-positions`: real positions while a session is running.
- `status`: a status h2 when positions are unavailable (no session, no credentials, upstream error).

## How to get to it (user POV)

- Header "Live" link, or open `/live`.

## Driving it with scripts/verify-pit-lane-hub.mjs

Preconditions: baseline.

- Open `/live` → `drive live`. Result: HTTP 200 and exactly one h1. If the h1 names a session, a timing row is visible within 20 s; if it reads "Live timing", the status h2 is visible.

## Gotchas

- Without OpenF1 credentials the finished-session table is observable; positions during a running session stay unproven until a session runs with credentials.
- The drive accepts any h2 in `main`. It does not check the status text.
