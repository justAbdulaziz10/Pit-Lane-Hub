# 🏎️ Pit Lane Hub

**Your ultimate destination for live F1 racing data, driver standings, race calendar, and real-time timing.**

🌐 **Live Site**: [f1-xi-weld.vercel.app](https://f1-xi-weld.vercel.app)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Live Timing** | Real-time session data during F1 weekends |
| 🏆 **Standings** | Current driver and constructor championships |
| 👤 **Driver Profiles** | Detailed driver info with career stats |
| 🏁 **Race Calendar** | Full 2026 F1 season schedule |
| 📈 **Compare Drivers** | Side-by-side driver statistics |
| 📚 **Historical Data** | Browse F1 seasons from 2023-2026 |
| 🏁 **F2 & F3 Info** | Feeder series team listings |
| 🗺️ **Track Maps** | Interactive circuit layouts with live positions |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) + React 19
- **Data Sources**: [OpenF1 API](https://openf1.org/) (live timing) and the
  [Ergast/Jolpica API](https://api.jolpi.ca/ergast/f1) (historical standings & career stats)
- **Auth**: [NextAuth v5](https://authjs.dev/) with the Prisma adapter (credentials + Resend magic links)
- **Database**: PostgreSQL via [Prisma](https://www.prisma.io/)
- **Payments**: [Polar](https://polar.sh/) (primary) with legacy [Stripe](https://stripe.com/) support
- **3D**: [Three.js](https://threejs.org/) via React Three Fiber for circuit maps
- **Styling**: CSS Modules with a custom design-token system
- **Testing**: [Vitest](https://vitest.dev/)
- **Hosting**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm
- A PostgreSQL database (for auth — the public F1 data works without it)

### Installation

```bash
git clone https://github.com/justAbdulaziz10/Pit-Lane-Hub.git
cd Pit-Lane-Hub
npm install

# Configure environment variables
cp .env.example .env.local   # then fill in the values

# Apply the database schema (only needed for auth/subscriptions)
npx prisma migrate dev

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Environment variables

All required variables are documented in [`.env.example`](.env.example) — database URLs,
NextAuth secret, Resend, and Polar/Stripe credentials. The webhook routes **require** their
signing secrets (`POLAR_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`) and fail closed without them.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run tests in watch mode |

---

## 📡 Data Updates

**Data updates automatically!** The site uses the OpenF1 API which provides:

- **Live session data** refreshes every 10 seconds during active sessions
- **Driver data** refreshes every 60 seconds
- **Race schedule** refreshes every hour
- **Historical data** is cached for 1 year

No manual updates needed - the API always returns the latest F1 data.

---

## 💰 Support the Project

If you find this project useful, consider supporting it:

- ☕ [Buy Me a Coffee](https://buymeacoffee.com/justAbdulaziz10)
- 🏎️ [Pit Lane Pro Membership](https://buymeacoffee.com/justAbdulaziz10/membership) - $4.99/month

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
│   └── support/           # Donation page
│   ├── api/               # Route handlers (auth, Polar/Stripe webhooks)
│   ├── error.js           # App-level error boundary
│   └── not-found.js       # 404 page
├── components/            # Reusable React components
└── lib/
    ├── f1/                # F1 data layer
    │   ├── constants.js   # Team colours, titles, nationalities, Ergast IDs
    │   ├── openf1.js      # OpenF1 API wrappers (live data)
    │   └── ergast.js      # Ergast API wrappers (standings, career stats)
    ├── f1api.js           # Barrel re-export of the f1/ modules
    ├── validation.js      # Email/password validation
    └── photos.js          # Headshot URL helpers

tests/                     # Vitest unit tests
```

---

## 🧪 Testing

Unit tests cover the data-layer transforms, input validation, and webhook signature
verification:

```bash
npm test
```

---

## 🔗 API Reference

This project uses the [OpenF1 API](https://openf1.org/):

- **Drivers**: `GET /v1/drivers`
- **Sessions**: `GET /v1/sessions`
- **Meetings**: `GET /v1/meetings`
- **Positions**: `GET /v1/position`
- **Weather**: `GET /v1/weather`

All data is fetched in real-time with automatic revalidation.

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
