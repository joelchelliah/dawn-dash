import path from 'path'

import withPWA from 'next-pwa'

import { TOOL_REGISTRY } from './src/shared/config/toolRegistry'

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Disable image optimization for preview deployments
    unoptimized: process.env.VERCEL_ENV === 'preview',
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
    return TOOL_REGISTRY.flatMap(
      (tool) =>
        tool.legacyPaths?.map((source) => ({
          source,
          destination: tool.path,
          permanent: true,
        })) ?? []
    )
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

// next-pwa is curried: withPWA(pluginOptions) returns a wrapper that must be
// applied to the Next config — spreading the wrapper into an object silently
// drops the plugin entirely (no service worker gets built).
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
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)
