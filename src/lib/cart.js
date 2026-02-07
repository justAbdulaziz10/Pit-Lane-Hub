// Cart utilities using localStorage
const CART_KEY = 'f1_cart';

/**
 * Get cart from localStorage
 */
export function getCart() {
    if (typeof window === 'undefined') return [];
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
}

/**
 * Save cart to localStorage
 * @param {Array} cart 
 */
export function saveCart(cart) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/**
 * Add item to cart
 * @param {Object} product 
 * @param {number} quantity 
 */
export function addToCart(product, quantity = 1) {
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }

    saveCart(cart);
    return cart;
}

/**
 * Remove item from cart
 * @param {string} productId 
 */
export function removeFromCart(productId) {
    const cart = getCart().filter(item => item.id !== productId);
    saveCart(cart);
    return cart;
}

/**
 * Update item quantity
 * @param {string} productId 
 * @param {number} quantity 
 */
export function updateQuantity(productId, quantity) {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);

    if (item) {
        if (quantity <= 0) {
            return removeFromCart(productId);
        }
        item.quantity = quantity;
        saveCart(cart);
    }

    return cart;
}

/**
 * Clear entire cart
 */
export function clearCart() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CART_KEY);
    return [];
}

/**
 * Get cart total
 */
export function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Get cart item count
 */
export function getCartCount() {
    const cart = getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
}
