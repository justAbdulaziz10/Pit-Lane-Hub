'use client';

import ProductCard from '@/components/ProductCard';
import { categories, getProductsByCategory } from '@/data/products';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import styles from './page.module.css';

function StoreContent() {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category') || 'all';
    const [activeCategory, setActiveCategory] = useState(categoryParam);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducts = getProductsByCategory(activeCategory).filter(
        (product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Filters */}
            <div className={styles.filters}>
                <div className="container">
                    <div className={styles.filterRow}>
                        {/* Categories */}
                        <div className={styles.categories}>
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    className={`${styles.categoryBtn} ${activeCategory === category.id ? styles.active : ''}`}
                                    onClick={() => setActiveCategory(category.id)}
                                >
                                    <span className={styles.categoryIcon}>{category.icon}</span>
                                    <span>{category.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className={styles.search}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className={styles.products}>
                <div className="container">
                    <div className={styles.resultsInfo}>
                        <span>{filteredProducts.length} products</span>
                    </div>

                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-4">
                            {filteredProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.noResults}>
                            <span className={styles.noResultsIcon}>🏎️</span>
                            <h3>No products found</h3>
                            <p>Try adjusting your search or filter</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function LoadingState() {
    return (
        <div className={styles.loading}>
            <div className="spinner"></div>
            <p>Loading store...</p>
        </div>
    );
}

export default function StorePage() {
    return (
        <div className={styles.store}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <h1>The Store</h1>
                    <p>Premium F1 merchandise for true racing enthusiasts</p>
                </div>
            </div>

            <Suspense fallback={<LoadingState />}>
                <StoreContent />
            </Suspense>
        </div>
    );
}
