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
};

export default nextConfig;
