/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async redirects() {
    return [
      // The junior-series page carried stale hand-maintained data and was removed.
      { source: '/junior', destination: '/standings', permanent: true },
      { source: '/junior/:path*', destination: '/standings', permanent: true },
    ];
  },
};

export default nextConfig;
