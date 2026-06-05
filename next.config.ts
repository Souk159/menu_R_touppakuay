import type { NextConfig } from 'next'

const config: NextConfig = {
  serverExternalPackages: ['bcryptjs'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'touppakuay.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/uploads/**',
      },
    ],
    // Allow local /uploads path (served from public/)
    unoptimized: process.env.NODE_ENV !== 'production',
  },
}

export default config
