// F1 Merchandise Products
// Stripe Payment Links will be added when you create products in Stripe Dashboard

export const products = [
    // APPAREL
    {
        id: 'tshirt-racing-red',
        name: 'Racing Red Team T-Shirt',
        description: 'Premium cotton racing t-shirt with embroidered F1 logo. Feel the speed.',
        price: 49.99,
        category: 'apparel',
        image: '/products/tshirt-red.jpg',
        badge: 'BEST SELLER',
        stripeLink: '', // Add your Stripe Payment Link
    },
    {
        id: 'hoodie-carbon',
        name: 'Carbon Black Hoodie',
        description: 'Luxurious fleece hoodie inspired by F1 car carbon fiber. Stay warm in the paddock.',
        price: 89.99,
        category: 'apparel',
        image: '/products/hoodie-carbon.jpg',
        badge: null,
        stripeLink: '',
    },
    {
        id: 'cap-champion',
        name: 'Champion\'s Cap',
        description: 'Iconic racing cap with checkered flag detail. Worn by champions.',
        price: 34.99,
        category: 'apparel',
        image: '/products/cap-champion.jpg',
        badge: 'NEW',
        stripeLink: '',
    },
    {
        id: 'jacket-pit-crew',
        name: 'Pit Crew Jacket',
        description: 'Official style pit crew jacket. Fireproof materials, race-ready design.',
        price: 199.99,
        category: 'apparel',
        image: '/products/jacket-pit.jpg',
        badge: 'PREMIUM',
        stripeLink: '',
    },

    // ACCESSORIES
    {
        id: 'watch-chronograph',
        name: 'F1 Chronograph Watch',
        description: 'Precision timing watch with lap timer function. Swiss movement.',
        price: 299.99,
        category: 'accessories',
        image: '/products/watch.jpg',
        badge: 'LIMITED',
        stripeLink: '',
    },
    {
        id: 'keychain-wheel',
        name: 'Racing Wheel Keychain',
        description: 'Miniature F1 steering wheel keychain. Genuine metal construction.',
        price: 19.99,
        category: 'accessories',
        image: '/products/keychain.jpg',
        badge: null,
        stripeLink: '',
    },
    {
        id: 'bag-helmet',
        name: 'Helmet Bag',
        description: 'Premium helmet bag with carrying strap. Padded protection.',
        price: 79.99,
        category: 'accessories',
        image: '/products/bag.jpg',
        badge: null,
        stripeLink: '',
    },
    {
        id: 'sunglasses-podium',
        name: 'Podium Sunglasses',
        description: 'Polarized racing sunglasses. UV protection for sunny race days.',
        price: 149.99,
        category: 'accessories',
        image: '/products/sunglasses.jpg',
        badge: 'NEW',
        stripeLink: '',
    },

    // COLLECTIBLES
    {
        id: 'model-car',
        name: '1:18 Scale Race Car Model',
        description: 'Detailed die-cast model of a championship winning car. Collector\'s edition.',
        price: 249.99,
        category: 'collectibles',
        image: '/products/model-car.jpg',
        badge: 'COLLECTOR',
        stripeLink: '',
    },
    {
        id: 'helmet-replica',
        name: 'Mini Helmet Replica',
        description: '1:2 scale replica helmet. Hand-painted with authentic livery.',
        price: 179.99,
        category: 'collectibles',
        image: '/products/mini-helmet.jpg',
        badge: 'LIMITED',
        stripeLink: '',
    },
    {
        id: 'poster-vintage',
        name: 'Vintage GP Poster',
        description: 'Art deco style Grand Prix poster. Museum-quality print.',
        price: 49.99,
        category: 'collectibles',
        image: '/products/poster.jpg',
        badge: null,
        stripeLink: '',
    },
    {
        id: 'tire-piece',
        name: 'Race-Used Tire Piece',
        description: 'Authentic piece of race-used F1 tire. Certificate of authenticity included.',
        price: 99.99,
        category: 'collectibles',
        image: '/products/tire.jpg',
        badge: 'AUTHENTIC',
        stripeLink: '',
    },

    // DIGITAL
    {
        id: 'wallpaper-pack',
        name: 'F1 Wallpaper Pack',
        description: '50+ 4K wallpapers featuring stunning F1 photography. Instant download.',
        price: 9.99,
        category: 'digital',
        image: '/products/wallpaper.jpg',
        badge: 'DIGITAL',
        stripeLink: '',
    },
    {
        id: 'radio-compilation',
        name: 'Team Radio Compilation',
        description: 'Greatest F1 team radio moments. MP3 download with 100+ clips.',
        price: 14.99,
        category: 'digital',
        image: '/products/radio.jpg',
        badge: 'DIGITAL',
        stripeLink: '',
    },

    // EXPERIENCES
    {
        id: 'vip-experience',
        name: 'VIP Race Day Experience',
        description: 'Exclusive pit lane access, paddock tour, and hospitality. Once in a lifetime.',
        price: 2499.99,
        category: 'experiences',
        image: '/products/vip.jpg',
        badge: 'VIP',
        stripeLink: '',
    },
    {
        id: 'driving-experience',
        name: 'F1 Driving Experience',
        description: 'Drive a real F1 car at a professional circuit. 5 laps included.',
        price: 4999.99,
        category: 'experiences',
        image: '/products/driving.jpg',
        badge: 'ULTIMATE',
        stripeLink: '',
    },
];

export const categories = [
    { id: 'all', name: 'All Products', icon: '🏎️' },
    { id: 'apparel', name: 'Apparel', icon: '👕' },
    { id: 'accessories', name: 'Accessories', icon: '⌚' },
    { id: 'collectibles', name: 'Collectibles', icon: '🏆' },
    { id: 'digital', name: 'Digital', icon: '📱' },
    { id: 'experiences', name: 'Experiences', icon: '🎫' },
];

export function getProductsByCategory(category) {
    if (category === 'all') return products;
    return products.filter(p => p.category === category);
}

export function getProductById(id) {
    return products.find(p => p.id === id);
}

export function getFeaturedProducts() {
    return products.filter(p => p.badge === 'BEST SELLER' || p.badge === 'NEW' || p.badge === 'LIMITED');
}
