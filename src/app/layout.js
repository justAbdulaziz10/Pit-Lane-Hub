'use client';

import Cart from '@/components/Cart';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useState } from 'react';
import './globals.css';

export default function RootLayout({ children }) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Pit Lane Store | F1 Merchandise & Live Racing Data</title>
        <meta name="description" content="Your ultimate destination for F1 merchandise and live racing data. Shop apparel, accessories, collectibles, and more." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Header onCartClick={() => setIsCartOpen(true)} />
        <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
