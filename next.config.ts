import path from 'path'

import withPWA from 'next-pwa'

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'blightbane.io',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'dawn-dash.com',
        pathname: '/**',
      },
    ],
  },
  sassOptions: {
    includePaths: [path.join(__dirname, 'src/styles')],
  },
  async redirects() {
    return [
      {
        source: '/codex/cards',
        destination: '/cardex',
        permanent: true,
      },
      {
        source: '/codex/skills',
        destination: '/skilldex',
        permanent: true,
      },
      {
        source: '/codex/events',
        destination: '/eventmaps',
        permanent: true,
      },
    ]
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
      '@/shared': path.join(__dirname, 'src/shared'),
      '@/codex': path.join(__dirname, 'src/codex'),
      '@/speedruns': path.join(__dirname, 'src/speedruns'),
    }
    return config
  },
}

const wpaConfig = withPWA({
  dest: 'public',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/blightbane\.io\/images\/.*\.(?:png|webp|jpg|jpeg|svg|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'external-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 10 * 24 * 60 * 60, // 10 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
  disable: process.env.NODE_ENV === 'development',
})

export default {
  ...nextConfig,
  ...wpaConfig,
}
