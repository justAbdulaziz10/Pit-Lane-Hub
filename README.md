# Pit Lane Hub

Formula 1 calendar, results, standings, live timing, driver and team pages, and championship
history. Live site: [f1-xi-weld.vercel.app](https://f1-xi-weld.vercel.app).

Unofficial fan site. Not affiliated with Formula 1, the FIA or any team.

## Stack

- Next.js 16 (App Router), React 19, CSS Modules
- Auth.js v5 with the Prisma adapter (verified password accounts and Resend magic links)
- PostgreSQL via Prisma
- Polar for the optional Pit Lane Pro subscription
- Vitest for unit tests, Playwright for smoke tests

## Setup

Requirements: Node.js 20 or newer, npm, and PostgreSQL if you need accounts. The F1 pages work
without a database.

```bash
git clone https://github.com/justAbdulaziz10/Pit-Lane-Hub.git
cd Pit-Lane-Hub
npm ci                         # also runs `prisma generate`
cp .env.example .env.local     # then fill in the values
npx prisma migrate deploy      # apply the schema (accounts and subscriptions only)
npm run dev                    # http://localhost:3000
```

### Environment variables

Every variable is documented in [`.env.example`](.env.example).

| Variable | Needed for |
|----------|-----------|
| `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | Database (pooled runtime URL, direct URL for migrations) |
| `AUTH_SECRET` | Auth.js sessions; any value works for a local build |
| `NEXT_PUBLIC_SITE_URL` | Absolute links in emails and Polar return URLs |
| `AUTH_TRUST_HOST` | Only when running `next start` outside Vercel |
| `AUTH_RESEND_KEY`, `EMAIL_FROM` | Magic links and verification emails |
| `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_SERVER`, `POLAR_WEBHOOK_SECRET` | Pit Lane Pro checkout, customer portal and webhook |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional shared rate limits (`auth:*` uses the Postgres `RateLimit` table when Upstash is not configured) |
| `OPENF1_USERNAME`, `OPENF1_PASSWORD` | Optional authenticated OpenF1 access |

Checkout returns 503 until the Polar token and product ID are set. The webhook rejects requests
when `POLAR_WEBHOOK_SECRET` is missing. Its endpoint is `<site>/api/polar/webhook`, subscribed to
`subscription.*` events.

## Deploy

- Upstash is optional. When it is not configured, `auth:*` rate limits use the Postgres `RateLimit` table.
- Before `npx prisma migrate deploy`, run `psql -f scripts/check-email-duplicates.sql` against the target database.
- Set `POLAR_SERVER` and `POLAR_WEBHOOK_SECRET` for Polar checkout and webhooks.
- `EMAIL_FROM` must use a domain verified with Resend. Set `NEXT_PUBLIC_SITE_URL` to the public site origin for verification emails and Polar return links.
- English routes stay unprefixed; Arabic pages use `/ar` (for example, `/ar/login` and `/ar/support`).

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (no network; upstream APIs are mocked) |
| `AUTH_SECRET=dummy npm run build` | Production build (data pages render at request time, so the build does not call the F1 APIs) |
| `npm start` | Serve the production build |
| `npm run test:e2e` | Playwright smoke tests against a production build on port 3000 |
| `node scripts/update-f1-snapshots.mjs drivers` | Refresh the bundled all-time driver list (about 10 Jolpica requests) |
| `node scripts/update-f1-snapshots.mjs champions` | Refresh the bundled champions history (about 145 Jolpica requests) |

The smoke tests check page shells, headings and status codes. Data assertions are skipped when
an upstream API is unavailable. Install the browser once with `npx playwright install chromium`.

## Data sources

| Source | Used for | Limits |
|--------|----------|--------|
| [Jolpica F1](https://github.com/jolpica/jolpica-f1) (Ergast-compatible) | Calendar, results, qualifying, standings, career statistics, history since 1950 | About 4 requests per second and 500 per hour; at most 100 rows per page |
| [OpenF1](https://openf1.org) | Sessions, meetings, drivers, live timing, tyre stints, pit stops, race control | Public rate limits; some in-session data may require authenticated access |

All requests go through `src/lib/f1/http.js`, which caches responses with `unstable_cache`
(5 minutes for live data, up to a day for historical data) and keeps the last good value when an
upstream call fails. If an API stays down, the route's error page offers a retry instead of
showing empty data. Snapshots in `src/lib/f1/data/` hold past champions and the all-time driver
list, so history and compare pages don't spend the Jolpica hourly quota; newer seasons are added live.

## Project layout

```
src/
  app/            routes (calendar, standings, live, drivers, driver/[number], teams, team/[id],
                  race/[key], tracks, history, compare, support, login, signup, profile, api/)
  components/     shared UI (header, footer, driver cards, local time, circuit panel)
  lib/f1/         data layer: Jolpica and OpenF1 clients, season, results, standings, history
  lib/            validation, rate limiting, Polar client, JSON-LD, site config
  auth.js         Auth.js configuration
prisma/           schema and migrations
tests/            Vitest unit tests
e2e/              Playwright smoke tests
scripts/          snapshot refresh script
```

## Support

The site is free. Tips go through [Buy Me a Coffee](https://buymeacoffee.com/justAbdulaziz10);
Pit Lane Pro is a monthly Polar subscription that adds a supporter badge to your profile.

## License

MIT. See [LICENSE](LICENSE).
