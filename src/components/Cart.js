'use client';

import { clearCart, getCart, getCartTotal, removeFromCart, updateQuantity } from '@/lib/cart';
import { useEffect, useState } from 'react';
import styles from './Cart.module.css';

export default function Cart({ isOpen, onClose }) {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const updateCartData = () => {
            setItems(getCart());
            setTotal(getCartTotal());
        };

        updateCartData();
        window.addEventListener('cartUpdated', updateCartData);
        window.addEventListener('storage', updateCartData);

        return () => {
            window.removeEventListener('cartUpdated', updateCartData);
            window.removeEventListener('storage', updateCartData);
        };
    }, []);

    const handleUpdateQuantity = (productId, newQuantity) => {
        updateQuantity(productId, newQuantity);
        setItems(getCart());
        setTotal(getCartTotal());
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const handleRemove = (productId) => {
        removeFromCart(productId);
        setItems(getCart());
        setTotal(getCartTotal());
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const handleClearCart = () => {
        clearCart();
        setItems([]);
        setTotal(0);
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const handleCheckout = () => {
        // For now, just show an alert - in production, redirect to Stripe
        alert('Checkout functionality will be enabled once Stripe Payment Links are configured in the product data!');
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`}
                onClick={onClose}
            />

            {/* Cart Panel */}
            <div className={`${styles.cart} ${isOpen ? styles.cartOpen : ''}`}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <span className={styles.titleIcon}>🛒</span>
                        Your Cart
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Items */}
                <div className={styles.items}>
                    {items.length === 0 ? (
                        <div className={styles.empty}>
                            <span className={styles.emptyIcon}>🏎️</span>
                            <p className={styles.emptyText}>Your cart is empty</p>
                            <p className={styles.emptySubtext}>Add some racing gear!</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className={styles.item}>
                                <div className={styles.itemImage}>
                                    <span>🏎️</span>
                                </div>
                                <div className={styles.itemContent}>
                                    <h4 className={styles.itemName}>{item.name}</h4>
                                    <span className={styles.itemPrice}>${item.price.toFixed(2)}</span>
                                    <div className={styles.itemActions}>
                                        <div className={styles.quantity}>
                                            <button
                                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                            >
                                                −
                                            </button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>
                                                +
                                            </button>
                                        </div>
                                        <button
                                            className={styles.removeButton}
                                            onClick={() => handleRemove(item.id)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className={styles.footer}>
                        <div className={styles.totalRow}>
                            <span>Subtotal</span>
                            <span className={styles.totalPrice}>${total.toFixed(2)}</span>
                        </div>
                        <p className={styles.shipping}>Shipping calculated at checkout</p>
                        <button className={styles.checkoutButton} onClick={handleCheckout}>
                            Proceed to Checkout
                        </button>
                        <button className={styles.clearButton} onClick={handleClearCart}>
                            Clear Cart
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
