import ProductCard from '@/components/ProductCard';
import { getFeaturedProducts } from '@/data/products';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const featuredProducts = getFeaturedProducts().slice(0, 4);

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.heroOverlay}></div>
          <div className={styles.heroGrid}></div>
        </div>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>🏎️ THE ULTIMATE F1 EXPERIENCE</span>
          <h1 className={styles.heroTitle}>
            Welcome to the<br />
            <span className={styles.heroHighlight}>Pit Lane</span>
          </h1>
          <p className={styles.heroDescription}>
            Premium F1 merchandise, live racing data, and exclusive experiences.
            Fuel your passion for Formula 1.
          </p>
          <div className={styles.heroActions}>
            <Link href="/store" className="btn btn-primary">
              Shop Now
            </Link>
            <Link href="/drivers" className="btn btn-secondary">
              View Drivers
            </Link>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>16</span>
            <span className={styles.statLabel}>Products</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>20</span>
            <span className={styles.statLabel}>Drivers</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>24</span>
            <span className={styles.statLabel}>Races</span>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className={styles.featured}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Featured Products</h2>
            <Link href="/store" className={styles.viewAll}>
              View All →
            </Link>
          </div>
          <div className="grid grid-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className={styles.categories}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Shop by Category</h2>
          <div className={styles.categoryGrid}>
            <Link href="/store?category=apparel" className={styles.categoryCard}>
              <span className={styles.categoryIcon}>👕</span>
              <h3>Apparel</h3>
              <p>T-shirts, hoodies, caps & more</p>
            </Link>
            <Link href="/store?category=accessories" className={styles.categoryCard}>
              <span className={styles.categoryIcon}>⌚</span>
              <h3>Accessories</h3>
              <p>Watches, bags, sunglasses</p>
            </Link>
            <Link href="/store?category=collectibles" className={styles.categoryCard}>
              <span className={styles.categoryIcon}>🏆</span>
              <h3>Collectibles</h3>
              <p>Models, replicas, memorabilia</p>
            </Link>
            <Link href="/store?category=experiences" className={styles.categoryCard}>
              <span className={styles.categoryIcon}>🎫</span>
              <h3>Experiences</h3>
              <p>VIP access, driving days</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Data Banner */}
      <section className={styles.liveBanner}>
        <div className="container">
          <div className={styles.liveContent}>
            <span className={styles.liveBadge}>🔴 LIVE DATA</span>
            <h2>Real-Time F1 Updates</h2>
            <p>Powered by OpenF1 API - Free and open source</p>
            <div className={styles.liveLinks}>
              <Link href="/drivers" className="btn btn-ghost">
                👨‍✈️ Drivers
              </Link>
              <Link href="/schedule" className="btn btn-ghost">
                📅 Schedule
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className={styles.newsletter}>
        <div className="container">
          <div className={styles.newsletterContent}>
            <h2>Join the Grid</h2>
            <p>Get exclusive deals, race alerts, and F1 news straight to your inbox.</p>
            <form className={styles.newsletterForm}>
              <input
                type="email"
                placeholder="Your email address"
                className={styles.newsletterInput}
              />
              <button type="submit" className="btn btn-primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
