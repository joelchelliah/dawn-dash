import withPWA from 'next-pwa'

export default withPWA({
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
  // Next.js options:
  reactStrictMode: true,
  images: {
    domains: ['blightbane.io', 'dawn-dash.com'],
  },
  // next-pwa options:
  disable: process.env.NODE_ENV === 'development',
})
