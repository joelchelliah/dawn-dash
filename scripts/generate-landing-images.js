// @ts-check
/**
 * Regenerates the landing-page thumbnails in `public/` from the OG images.
 *
 * Usage:
 *   npm run generate-landing-images                 # regenerate all, overwriting in place
 *   npm run generate-landing-images -- --dry-run    # report what would change, write nothing
 *   npm run generate-landing-images -- cardex booty # only these tools
 *   npm run generate-landing-images -- --quality 90
 *
 * Each `public/og-image-<tool>.png` (2400x1260) becomes `public/landing-<tool>.webp`
 * (800x420) — the same 21:10 aspect ratio at a third of the size, so the resize is a
 * clean downscale with no cropping. A source whose aspect ratio differs is reported
 * and skipped rather than silently letterboxed or cropped off-centre.
 *
 * `og-image-dawndash.png` has no landing counterpart on purpose: the landing page shows
 * the six tools, not itself. It is skipped unless named explicitly on the command line.
 */

const fs = require('fs')
const path = require('path')

const PUBLIC_DIR = path.join(__dirname, '../public')
const TARGET_WIDTH = 800
const TARGET_HEIGHT = 420
const DEFAULT_QUALITY = 85

/** The landing page shows the tools, not the site itself, so dawndash gets no thumbnail. */
const SKIPPED_BY_DEFAULT = ['dawndash']

/** Aspect ratios this far apart are treated as a mismatch rather than rounding noise. */
const ASPECT_TOLERANCE = 0.01

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
  const tools = []
  let dryRun = false
  let quality = DEFAULT_QUALITY

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--dry-run') dryRun = true
    else if (arg === '--quality') {
      quality = Number(argv[++i])
      if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
        throw new Error(`--quality expects a number from 1 to 100, got "${argv[i]}"`)
      }
    } else if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`)
    else tools.push(arg)
  }

  return { tools, dryRun, quality }
}

/** Every `og-image-<tool>.png` in public/, as tool names. */
function findSourceTools() {
  return fs
    .readdirSync(PUBLIC_DIR)
    .map((file) => /^og-image-(.+)\.png$/.exec(file))
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
  const { tools: requested, dryRun, quality } = parseArgs(process.argv.slice(2))

  const available = findSourceTools()
  const unknown = requested.filter((tool) => !available.includes(tool))
  if (unknown.length > 0) {
    throw new Error(
      `No og-image-<tool>.png for: ${unknown.join(', ')}\nAvailable: ${available.join(', ')}`
    )
  }

  const tools =
    requested.length > 0
      ? requested
      : available.filter((tool) => !SKIPPED_BY_DEFAULT.includes(tool))

  console.log(
    `Generating ${TARGET_WIDTH}x${TARGET_HEIGHT} webp (quality ${quality}) for: ${tools.join(', ')}` +
      (dryRun ? '  [dry run]' : '')
  )

  const skipped = []
  let written = 0

  for (const tool of tools) {
    const source = path.join(PUBLIC_DIR, `og-image-${tool}.png`)
    const target = path.join(PUBLIC_DIR, `landing-${tool}.webp`)

    const { width, height } = await sharp(source).metadata()
    const sourceAspect = width / height
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT

    if (Math.abs(sourceAspect - targetAspect) > ASPECT_TOLERANCE) {
      skipped.push(
        `${tool}: source is ${width}x${height} (${sourceAspect.toFixed(3)}), ` +
          `expected ${targetAspect.toFixed(3)} — resize would crop or distort`
      )
      continue
    }

    const before = fs.existsSync(target) ? fs.statSync(target).size : 0
    const buffer = await sharp(source)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'fill' })
      .webp({ quality })
      .toBuffer()

    if (!dryRun) fs.writeFileSync(target, buffer)
    written++

    const change =
      before > 0
        ? `${formatBytes(before)} -> ${formatBytes(buffer.length)}`
        : `new, ${formatBytes(buffer.length)}`
    console.log(`  ${dryRun ? 'would write' : 'wrote'} landing-${tool}.webp  (${change})`)
  }

  for (const message of skipped) console.warn(`  SKIPPED ${message}`)

  console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${written} image(s).`)
  if (skipped.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exitCode = 1
})
