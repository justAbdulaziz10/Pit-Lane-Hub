---
name: verify-pit-lane-hub
description: Prove Pit Lane Hub (Next.js F1 site) behavior by launching the real dev server and driving it in headless Chromium like a user - home/nav, drivers + favourites, driver/team/race detail, calendar, compare, history, circuits, standings, live timing, Arabic (RTL), account pages (render only), 404, old F2/F3 redirect. Use after any UI, route, or data change, before claiming a feature works.
---

# verify-pit-lane-hub

Primary surface: the web UI (Next.js 16 App Router). Other surfaces: NextAuth login/signup and Polar checkout/webhook API routes. Their pages render-check only; submissions are not driven (see Unproven).
Harness: `scripts/verify-pit-lane-hub.mjs`, a control CLI on the Playwright library already in devDependencies. Every command prints one JSON object; a failed check gives `"ok": false`, a `reason`, and exit 1.

## Setup (once per checkout)

```bash
npm ci                              # postinstall runs prisma generate
npx playwright install chromium     # must match the repo's @playwright/test version
```

No `.env` file is needed for public pages (but see the `AUTH_SECRET` note under Launch). Data comes live from OpenF1 and Jolpica/Ergast, so the machine needs internet access.

## Launch

```bash
scripts/verify-pit-lane-hub.mjs launch [--port 3117]
```
Starts `next dev -p 3117` in its own process group, writes `artifacts/verify/state.json` (pid, port) and `artifacts/verify/server.log`. Ready signal: `/` answers HTTP 200, after which launch prints `"ok": true` (cold start takes about 10-30 s). It refuses if the port is in use or a previous launch is still alive.

Set `AUTH_SECRET` (any dummy value) in the environment before launch, for example `AUTH_SECRET=dummy scripts/verify-pit-lane-hub.mjs launch`. Without it Auth.js logs `MissingSecret` and client session fetches fail.

## Doctor (read-only, before the first drive and after anything surprising)

```bash
scripts/verify-pit-lane-hub.mjs doctor
```
Checks: the launched PID is alive, every listener on the port belongs to our process group, and `/` returns 200. `drive` runs doctor itself and refuses to drive an instance it did not start.

## Drive

```bash
scripts/verify-pit-lane-hub.mjs features                 # list
scripts/verify-pit-lane-hub.mjs drive drivers-favorites  # one feature
scripts/verify-pit-lane-hub.mjs drive all                # every mapped feature
```
Each drive asserts its own expected outcome (headings visible, URL reached, `aria-pressed`, localStorage read-back, order after reload, HTTP status) and records every check as `{check, expected, actual, pass}`. State checks poll for up to 8 s because client components hydrate after SSR. Per-feature user paths and handles: [features/README.md](features/README.md).

## Evidence

`artifacts/verify/<feature>/<timestamp>/` contains `result.json` (steps, URL, page errors, reason) and `final.png` (viewport screenshot at the end, also on failure). `artifacts/` is git-ignored. Proof rules:
- Drive the real user path: real routes, real clicks on accessible roles and names. No test-only endpoints or calling hooks directly.
- Check the resulting state, not only that the action happened: the read-back from storage, ordering after reload, the status code.
- Look at `final.png` before making a visual claim.

## Cleanup

```bash
scripts/verify-pit-lane-hub.mjs stop --dry-run   # shows the process group it would kill
scripts/verify-pit-lane-hub.mjs stop
```
Kills only the process group recorded at launch (never by name), waits for the port to close, removes `state.json`. Evidence stays.

## Isolation and danger

- One dev server per checkout: `next dev` locks `.next/`. A second worktree can run its own instance on another `--port`.
- Drives are read-only against the outside world: GETs to public F1 APIs plus browser localStorage. Nothing here signs in, sends email (Resend), or touches Polar payments. Driving those needs sandbox credentials and the user's approval. Never point drives at production (`f1-xi-weld.vercel.app`).

## Proven (2026-10-27, macOS, Node 24, Playwright 1.61.0)

- launch, doctor, `drive all` (5/5 pass), stop, with evidence kept after cleanup.
- Break caught: changing `DriversGrid` so it ignores favorites made `drive drivers-favorites` exit 1 with `favorite pulled to front after reload: expected "/driver/87", got "/driver/1"`. The code was restored and all drives passed again.

## Maintenance pass (2026-10-28, macOS, Playwright 1.61.0)

- Source check of every route under `src/app/`. Added drives and feature files for driver-detail, teams-detail, calendar-race, compare, history, tracks, junior (F2/F3, since removed), and auth-pages (render only). `drive all` passes 13/13 live.
- Detail and calendar routes were slow on first load. Their first check waits with `visibleSoon` (40 s), because an immediate check sees only the loading state.

## Redesign pass (2026-10-30, macOS, Playwright 1.61.0)

- Drives were rewritten for the redesigned bilingual UI. Routes live under `src/app/[lang]/`. English has no prefix and Arabic is under `/ar`.
- Added the `arabic` drive: header "العربية" link, `/ar`, `dir=rtl`, `lang=ar`, links stay under `/ar`.
- `junior` now checks that `/junior` redirects to `/standings`. The F2/F3 page was removed.
- `drive all` passes 14/14 live.

## Unproven / not mapped

- Submitting login, signup, profile, or support/checkout needs Postgres (`POSTGRES_PRISMA_URL`), `AUTH_SECRET`, Resend, and Polar sandbox keys. None of these exist here, so only page render and the signed-out `/profile` redirect are driven.
- Tracks 3D canvas content is not asserted beyond the tab switching (Layout selected, then Map).
- Live Timing with real positions is only observable during a session weekend. Otherwise the page shows the "Entry List" fallback, which the drive accepts.
