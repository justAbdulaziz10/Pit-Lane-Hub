'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import NotificationBanner from '@/components/NotificationBanner';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Pit Lane Hub | Live F1 Data & Racing Stats</title>
        <meta name="description" content="Your ultimate destination for live F1 racing data, driver standings, race calendar, and real-time timing. Free and open source. By Abdulaziz." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#E10600" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Header />
        <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
          {children}
        </main>
        <Footer />
        <NotificationBanner />
      </body>
    </html>
  );
}
