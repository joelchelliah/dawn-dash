#!/usr/bin/env node

/**
 * Fails if the built service worker precaches anything that will 404.
 *
 * Workbox precaching is atomic: one bad response aborts the whole install and silently disables
 * every runtimeCaching rule with it. The only symptom is a `bad-precaching-response` console error,
 * so a broken worker looks exactly like a working one unless someone opens DevTools. That is how
 * `next-pwa` precaching a Next 15 build file (`dynamic-css-manifest.json`, which exists on disk but
 * is never served) went unnoticed until it was hunted down by hand.
 *
 * Usage:
 *   npm run build && npm run check-sw
 *
 * Requires a production build — `next-pwa` is disabled in development, so there is no worker to
 * check after `npm run dev`.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SERVICE_WORKER = path.join(ROOT, 'public/sw.js')

/**
 * Maps a precached URL to the file that must exist for it to serve.
 *
 * Only two shapes appear in the manifest: `/_next/static/**` is emitted from `.next/static`, and
 * everything else is a `public/` asset. Anything under `/_next/` but outside `/_next/static/` is
 * the failure this script exists to catch — Next writes build files there that it never serves.
 */
function resolveUrl(url) {
  // Percent-decoded because dynamic-route chunks are encoded in the manifest but not on disk:
  // `/_next/.../%5Bevent%5D-hash.js` is the file `[event]-hash.js`.
  const [urlPath] = decodeURIComponent(url).split('?')

  if (urlPath.startsWith('/_next/static/')) {
    return path.join(ROOT, '.next', urlPath.slice('/_next/'.length))
  }

  if (urlPath.startsWith('/_next/')) {
    return null // served by nothing — see above
  }

  return path.join(ROOT, 'public', urlPath)
}

function main() {
  if (!fs.existsSync(SERVICE_WORKER)) {
    console.error(`No service worker at ${SERVICE_WORKER}. Run \`npm run build\` first.`)
    process.exit(1)
  }

  const src = fs.readFileSync(SERVICE_WORKER, 'utf8')
  const urls = [...src.matchAll(/url:"([^"]+)"/g)].map((match) => match[1])

  if (!urls.length) {
    console.error('Found no precache entries — the manifest format may have changed.')
    process.exit(1)
  }

  const broken = urls.filter((url) => {
    const file = resolveUrl(url)
    return file === null || !fs.existsSync(file)
  })

  if (broken.length) {
    console.error(`\n${broken.length} of ${urls.length} precached URLs will 404:\n`)
    broken.forEach((url) => console.error(`  ${url}`))
    console.error(
      '\nWorkbox precaching is atomic, so these would abort the service worker install and\n' +
        'disable all runtime caching. Add a `buildExcludes` pattern in next.config.ts.\n'
    )
    process.exit(1)
  }

  console.log(`All ${urls.length} precached URLs resolve to real files.`)
}

main()
