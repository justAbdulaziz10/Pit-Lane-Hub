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

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Data Source**: [OpenF1 API](https://openf1.org/) - Free, open-source F1 data
- **Hosting**: [Vercel](https://vercel.com/) - Free tier
- **Styling**: CSS Modules with custom design system

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/justAbdulaziz10/Pit-Lane-Hub.git

# Navigate to the project
cd Pit-Lane-Hub

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

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
├── components/            # Reusable React components
└── lib/                   # API utilities and helpers
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
