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
  // next-pwa globs `.next/` for precache entries, but Next 15 writes some build files there that
  // it never serves under /_next/. `dynamic-css-manifest.json` is one: it exists on disk and 404s
  // over HTTP. Precaching is atomic, so a single 404 fails the whole install with
  // `bad-precaching-response` — which silently takes the runtimeCaching rules below with it.
  buildExcludes: [/dynamic-css-manifest\.json$/],
  runtimeCaching: [
    // Card/talent artwork (and the scoring panels' hardcoded icons) live under /images/icons/.
    // This bucket is separate from the one below and listed first — Workbox uses the first
    // matching pattern — so a large Cardex session cannot evict the class, energy and event
    // images the rest of the site depends on.
    //
    // 1500 entries at ~2.2KB each is roughly 3.2MB. There are ~2418 unique artwork files in all,
    // so a heavy user still cycles entries, but only within this bucket.
    {
      urlPattern: /^https:\/\/blightbane\.io\/images\/icons\/.*\.(?:png|webp|jpg|jpeg|svg|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'card-artwork',
        expiration: {
          maxEntries: 1500,
          maxAgeSeconds: 10 * 24 * 60 * 60, // 10 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Everything else: classes, energy orbs, event artwork, monsters. Small, fixed set, so the
    // original 100-entry ceiling is plenty now that card art has its own bucket.
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
