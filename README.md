# 🏎️ Pit Lane Hub

F1 standings, schedule, driver statistics, historical results, and session data in one place.

🌐 **Live Site**: [f1-xi-weld.vercel.app](https://f1-xi-weld.vercel.app)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Session Timing** | Session data from OpenF1 when available |
| 🏆 **Standings** | Current driver and constructor championships |
| 👤 **Driver Profiles** | Detailed driver info with career stats |
| 🏁 **Race Calendar** | Full 2026 F1 season schedule |
| 📈 **Compare Drivers** | Side-by-side driver statistics |
| 📚 **Historical Data** | Browse past F1 seasons from Jolpica |
| 🏁 **F2 & F3 Info** | Feeder series team listings |
| 🗺️ **Track Maps** | Interactive circuit layouts |
| 👤 **Accounts** | Verified password accounts and Resend magic links |
| 🏆 **Pit Lane Pro** | Polar subscriptions with a supporter badge on your profile |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) + React 19
- **Data Sources**: [OpenF1 API](https://openf1.org/) (live timing) and the
  [Ergast/Jolpica API](https://api.jolpi.ca/ergast/f1) (historical standings & career stats)
- **Auth**: [NextAuth v5](https://authjs.dev/) with the Prisma adapter (verified password accounts + Resend magic links)
- **Database**: PostgreSQL via [Prisma](https://www.prisma.io/)
- **Payments**: [Polar](https://polar.sh/) subscriptions
- **3D**: [Three.js](https://threejs.org/) via React Three Fiber for circuit maps
- **Styling**: CSS Modules with a custom design-token system
- **Testing**: [Vitest](https://vitest.dev/)
- **Hosting**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm
- A PostgreSQL database (for auth — the public F1 data works without it)

### Installation

```bash
git clone https://github.com/justAbdulaziz10/Pit-Lane-Hub.git
cd Pit-Lane-Hub
npm ci

# Configure environment variables
cp .env.example .env.local   # then fill in the values

# Apply the database schema (only needed for auth/subscriptions)
npx prisma migrate dev

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Environment variables

Copy [`.env.example`](.env.example) to `.env.local`; every variable is documented there.
Configure `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` for PostgreSQL,
`AUTH_SECRET` and `NEXT_PUBLIC_SITE_URL` for Auth.js and email links, `AUTH_RESEND_KEY`
and `EMAIL_FROM` for email, and `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_SERVER`,
and `POLAR_WEBHOOK_SECRET` for subscriptions. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are
optional; without both, rate limits use a process-local memory fallback. OpenF1 credentials
are optional. The Polar webhook rejects requests when its signing secret is missing.

After pulling schema changes, apply migrations with `npx prisma migrate deploy` (production)
or `npx prisma migrate dev` (local).

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run Playwright smoke tests against a production build |

---

## 📡 Data Sources

Session and current-season data comes from OpenF1. Historical standings, results, and
career statistics come from Jolpica. Availability and freshness depend on those public
APIs and the page's revalidation settings.

---

## 💰 Support the Project

If you find this project useful, consider supporting it:

- ☕ [Buy Me a Coffee](https://buymeacoffee.com/justAbdulaziz10)
- 🏎️ Pit Lane Pro subscriptions are started from the support page and checked out through Polar.

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── drivers/           # Drivers listing page
│   ├── driver/[number]/   # Individual driver profiles
│   ├── teams/             # Constructor standings
│   ├── standings/         # Championship standings
│   ├── schedule/          # Race calendar
│   ├── live/              # Live timing
│   ├── compare/           # Driver comparison
│   ├── history/           # Historical data browser
│   ├── junior/            # F2 & F3 info
│   ├── support/           # Tips and Pit Lane Pro
│   ├── api/               # Route handlers (auth, email verification, Polar checkout/portal/webhook)
│   ├── error.js           # App-level error boundary
│   └── not-found.js       # 404 page
├── components/            # Reusable React components
└── lib/
    ├── f1/                # F1 data layer
    │   ├── constants.js   # Team colours, titles, nationalities, Ergast IDs
    │   ├── openf1.js      # OpenF1 API wrappers (live data)
    │   └── ergast.js      # Ergast API wrappers (standings, results, qualifying,
    │                      #   schedule, career stats, season drivers)
    ├── f1api.js           # Barrel re-export of the f1/ modules
    ├── validation.js      # Email normalization and password validation
    ├── rate-limit.js      # Upstash REST and memory rate limits
    └── photos.js          # Headshot URL helpers

tests/                     # Vitest unit tests
```

---

## 🧪 Testing

Vitest covers data transforms, validation, rate limiting, auth, checkout, and Polar
webhook handling. Playwright drives smoke tests against the production server:

```bash
npm test          # unit tests
npm run test:e2e  # Playwright smoke tests (installs browsers on first run)
```

---

## 🔗 API Reference

This project uses the [OpenF1 API](https://openf1.org/):

- **Drivers**: `GET /v1/drivers`
- **Sessions**: `GET /v1/sessions`
- **Meetings**: `GET /v1/meetings`
- **Positions**: `GET /v1/position`
- **Weather**: `GET /v1/weather`

Data is fetched from those APIs with page-specific revalidation.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Abdulaziz**

- GitHub: [@justAbdulaziz10](https://github.com/justAbdulaziz10)
- Website: [Pit Lane Hub](https://f1-xi-weld.vercel.app)

---

## 🙏 Acknowledgments

- [OpenF1](https://openf1.org/) for the amazing free F1 API
- [Formula 1](https://www.formula1.com/) for the inspiration
- [Vercel](https://vercel.com/) for free hosting
- All the F1 fans who support this project!

---

Made with ❤️ for the F1 community
