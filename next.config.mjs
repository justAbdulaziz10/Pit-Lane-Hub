// Directives that cannot break Next's inline scripts: no framing (clickjacking on login and
// checkout), no <base> or plugin injection, and forms (including the billing-portal redirect)
// may only go to this site or Polar.
const CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https://polar.sh https://*.polar.sh",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.formula1.com',
      },
      {
        protocol: 'https',
        hostname: 'headshots.f1.com',
      },
      {
        protocol: 'https',
        hostname: 'flagsapi.com',
      }
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // The junior-series page carried stale hand-maintained data and was removed.
      { source: '/junior', destination: '/standings', permanent: true },
      { source: '/junior/:path*', destination: '/standings', permanent: true },
    ];
  },
};

export default nextConfig;
