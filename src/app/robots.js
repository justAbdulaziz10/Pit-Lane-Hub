export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: 'https://f1-xi-weld.vercel.app/sitemap.xml',
    }
}
