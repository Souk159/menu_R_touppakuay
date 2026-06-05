import type { NextConfig } from 'next'

const config: NextConfig = {
  serverExternalPackages: ['bcryptjs'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
}

export default config
