// @ts-check
/**
 * Compresses the og-images and logos from `image-sources/` into `public/`.
 *
 * Usage:
 *   npm run compress-images                    # compress all, overwriting public/
 *   npm run compress-images -- --dry-run       # report what would change, write nothing
 *   npm run compress-images -- og-image-booty  # only these files
 *   npm run compress-images -- --quality 80    # tune the palette
 *   npm run compress-images -- --lossless      # pixel-exact, but LARGER than the sources
 *
 * The originals live in `image-sources/` and are never written to; every run regenerates
 * `public/` from them. That is what makes this safe to re-run: palette quantization is
 * lossy, so a script that compressed `public/` in place would re-quantize its own output
 * and degrade the images a little more each time.
 *
 * `image-sources/` is outside `public/`, so nothing serves, precaches or bundles it — it
 * is checked in purely as the only copy that can regenerate quality if the setting changes.
 *
 * The saving comes entirely from **palette quantization** (256 colours), not from better
 * encoding: 23.1MB -> 6.0MB (74%) at the default quality 90. Re-encoding these losslessly is
 * not a smaller-but-safer option, it is a *worse* one — the sources are already well-compressed
 * PNGs, so a pixel-exact re-encode comes out at 27.2MB, 17% LARGER. `--lossless` exists only to
 * make that measurable; there is no reason to ship its output.
 *
 * Note `effort` is deliberately absent from the encode options. In sharp it implies
 * `palette: true`, so passing it silently quantizes even when palette is off — which makes a
 * "lossless" run quietly lossy. `--lossless` passes `palette: false` explicitly for that reason.
 *
 * Staying PNG (rather than WebP or JPEG) is also deliberate: these are only ever fetched by
 * Discord/Twitter/Facebook scrapers as og:image and JSON-LD `image` URLs, and keeping the
 * format unchanged keeps every scraper's URL and compatibility story unchanged with it.
 *
 * After changing an OG image, run `npm run generate-landing-images` — the landing thumbnails
 * are derived from `public/og-image-<tool>.png`, so they regenerate from this script's output.
 */

const fs = require('fs')
const path = require('path')

const SOURCE_DIR = path.join(__dirname, '../image-sources')
const PUBLIC_DIR = path.join(__dirname, '../public')
/** Feeds the palette quantizer, nothing else — ignored under --lossless. */
const DEFAULT_QUALITY = 90

function loadSharp() {
  try {
    return require('sharp')
  } catch {
    throw new Error(
      'sharp is not installed. Run `npm install --save-dev sharp` and try again.\n' +
        '(It normally ships as a dependency of Next, but that is not something to rely on.)'
    )
  }
}

/** @param {string[]} argv */
function parseArgs(argv) {
  const names = []
  let dryRun = false
  let lossless = false
  let quality = DEFAULT_QUALITY

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--dry-run') dryRun = true
    else if (arg === '--lossless') lossless = true
    else if (arg === '--quality') {
      quality = Number(argv[++i])
      if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
        throw new Error(`--quality expects a number from 1 to 100, got "${argv[i]}"`)
      }
    } else if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`)
    else names.push(arg.replace(/\.png$/, ''))
  }

  return { names, dryRun, lossless, quality }
}

/** Every `og-image-*.png` / `logo-*.png` in image-sources/, without the extension. */
function findSources() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(
      `No image-sources/ directory. It holds the uncompressed originals and is checked in —\n` +
        `if it is missing, restore it from git rather than compressing public/ in place.`
    )
  }

  return fs
    .readdirSync(SOURCE_DIR)
    .map((file) => /^((?:og-image|logo)-.+)\.png$/.exec(file))
    .filter((match) => match !== null)
    .map((match) => match[1])
    .sort()
}

/** @param {number} bytes */
function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)}kB`
}

async function main() {
  const sharp = loadSharp()
  const { names: requested, dryRun, lossless, quality } = parseArgs(process.argv.slice(2))

  const available = findSources()
  const unknown = requested.filter((name) => !available.includes(name))
  if (unknown.length > 0) {
    throw new Error(
      `Not in image-sources/: ${unknown.join(', ')}\nAvailable: ${available.join(', ')}`
    )
  }

  const names = requested.length > 0 ? requested : available

  console.log(
    `Compressing ${names.length} image(s) from image-sources/ ` +
      (lossless ? '(lossless — expect LARGER files)' : `(palette, quality ${quality})`) +
      (dryRun ? '  [dry run]' : '')
  )

  let sourceTotal = 0
  let outputTotal = 0

  for (const name of names) {
    const source = path.join(SOURCE_DIR, `${name}.png`)
    const target = path.join(PUBLIC_DIR, `${name}.png`)

    const sourceSize = fs.statSync(source).size
    const buffer = await sharp(source)
      .png({ compressionLevel: 9, ...(lossless ? { palette: false } : { palette: true, quality }) })
      .toBuffer()

    if (!dryRun) fs.writeFileSync(target, buffer)

    sourceTotal += sourceSize
    outputTotal += buffer.length

    const saved = (100 - (buffer.length / sourceSize) * 100).toFixed(0)
    console.log(
      `  ${dryRun ? 'would write' : 'wrote'} ${name}.png  ` +
        `(${formatBytes(sourceSize)} -> ${formatBytes(buffer.length)}, ${saved}% smaller)`
    )
  }

  const totalSaved = (100 - (outputTotal / sourceTotal) * 100).toFixed(0)
  console.log(
    `\n${dryRun ? 'Would write' : 'Wrote'} ${names.length} image(s): ` +
      `${formatBytes(sourceTotal)} -> ${formatBytes(outputTotal)} (${totalSaved}% smaller).`
  )
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exitCode = 1
})
