---
name: verify-pit-lane-hub
description: Prove Pit Lane Hub (Next.js F1 site) behavior by launching the real dev server and driving it in headless Chromium like a user - home/nav, drivers + favorites, standings, live timing, 404. Use after any UI, route, or data change, before claiming a feature works.
---

# verify-pit-lane-hub

Primary surface: the web UI (Next.js 16 App Router). Other surfaces: NextAuth login/signup, Polar checkout/webhook API routes (not driven here, see Unproven).
Harness: `scripts/verify-pit-lane-hub.mjs`, a control CLI on the Playwright library already in devDependencies. Every command prints one JSON object; a failed check gives `"ok": false`, a `reason`, and exit 1.

## Setup (once per checkout)

```bash
npm ci                              # postinstall runs prisma generate
npx playwright install chromium     # must match the repo's @playwright/test version
```

No `.env` is needed for public pages. Data comes live from OpenF1 and Jolpica/Ergast, so the machine needs internet access.

## Launch

```bash
scripts/verify-pit-lane-hub.mjs launch [--port 3117]
```
Starts `next dev -p 3117` in its own process group, writes `artifacts/verify/state.json` (pid, port) and `artifacts/verify/server.log`. Ready signal: `/` answers HTTP 200, after which launch prints `"ok": true` (cold start takes about 10-30 s). It refuses if the port is in use or a previous launch is still alive.

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

## Unproven / not mapped

- Login, signup, profile, and support/checkout flows need Postgres (`POSTGRES_PRISMA_URL`), `AUTH_SECRET`, Resend, and Polar sandbox keys. None of these exist here, so they are not driven.
- Compare, history, tracks (3D canvas), teams, team/driver/race detail pages are not mapped yet. Add them with `maintain-verification-skill`.
- Live Timing with real positions is only observable during a session weekend. Otherwise the page shows the "Entry List" fallback, which the drive accepts.
