'use client';

import { addToCart } from '@/lib/cart';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, onCartUpdate }) {
    const handleAddToCart = () => {
        addToCart(product);
        // Dispatch custom event to update cart UI
        window.dispatchEvent(new Event('cartUpdated'));
        if (onCartUpdate) onCartUpdate();
    };

    return (
        <div className={styles.card}>
            {/* Badge */}
            {product.badge && (
                <span className={`${styles.badge} ${styles[`badge${product.badge.replace(/\s+/g, '')}`]}`}>
                    {product.badge}
                </span>
            )}

            {/* Image */}
            <div className={styles.imageWrapper}>
                <div className={styles.imagePlaceholder}>
                    <span className={styles.placeholderIcon}>🏎️</span>
                    <span className={styles.placeholderText}>{product.name}</span>
                </div>
            </div>

            {/* Content */}
            <div className={styles.content}>
                <span className={styles.category}>{product.category}</span>
                <h3 className={styles.name}>{product.name}</h3>
                <p className={styles.description}>{product.description}</p>

                <div className={styles.footer}>
                    <span className={styles.price}>${product.price.toFixed(2)}</span>
                    <button className={styles.addButton} onClick={handleAddToCart}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        Add
                    </button>
                </div>
            </div>

            {/* Hover Overlay */}
            <div className={styles.overlay}>
                <button className={styles.quickView}>Quick View</button>
            </div>
        </div>
    );
}
