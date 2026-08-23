// @ts-check
/**
 * Regenerates the star positions in `src/shared/components/StarField/stars.ts`.
 *
 * Usage:
 *   npm run generate-stars                        # regenerate at the current counts
 *   npm run generate-stars -- --desktop 140       # change the star count
 *   npm run generate-stars -- --tablet 100 --mobile 70
 *   npm run generate-stars -- --preview           # print the layouts, write nothing
 *   npm run generate-stars -- --grid 14x10        # override the jitter grid
 *
 * The counts are a tier list: the file holds `desktop` stars per band and the
 * stylesheet hides the tail down to `tablet` and `mobile`. So a layout has to look
 * good at THREE different densities, not one — which is what most of this script is
 * about. See `scoreLayout` for the specific failure modes it guards against, all of
 * which shipped at some point and were visible on screen while some simpler metric
 * said they were fine.
 *
 * After running, update the `nth-child` cutoffs in
 * `src/shared/components/StarField/index.module.scss` if the counts changed — the
 * script prints the exact values to use, since `nth-child` needs literal numbers.
 */

const fs = require('fs')
const path = require('path')

const OUTPUT_FILE = path.join(__dirname, '../src/shared/components/StarField/stars.ts')

/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ x: number, y: number, radius: number, delay: number }} Star */
/** @typedef {{ mobile: number, tablet: number, desktop: number }} Counts */
/** @typedef {{ cols: number, rows: number }} Grid */

// Minimum gap between two stars, in band-percentage units. Below roughly this they
// render as one smudge rather than two stars. Scaled down as density rises, since a
// packed field cannot honour a wide separation.
const MIN_SEPARATION_AT_100 = 3.0

// Weight applied to x before measuring distance in the ordering pass. Must be >= 1.
// Below 1 the ordering treats horizontal gaps as cheap and stacks prefixes into
// vertical stripes — see the header of the generated file.
const X_WEIGHTS = [1.2, 1.5, 1.8, 2.2]

const SEEDS_PER_BAND = 60

/** Mulberry32 — small deterministic PRNG, so a given seed always yields the same band. */
/**
 * @param {number} seed
 * @returns {() => number}
 */
function makeRandom(seed) {
  let a = seed >>> 0
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Places one star at random inside each cell of a grid.
 *
 * The jitter deliberately overspills its cell (-0.15..1.15) so neighbouring cells
 * overlap: without that, every star sits away from the cell edges and the grid shows
 * up as faint empty gutters between rows. A minimum-separation retry stops the overlap
 * from letting two stars land on top of each other.
 */
/**
 * @param {number} seed
 * @param {number} cols
 * @param {number} rows
 * @param {number} minSeparation
 * @returns {Point[]}
 */
function generatePoints(seed, cols, rows, minSeparation) {
  const random = makeRandom(seed)
  /** @type {Point[]} */
  const points = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = 0
      let y = 0
      for (let attempt = 0; attempt < 600; attempt++) {
        x = Math.min(99, Math.max(1, ((col + (random() * 1.3 - 0.15)) / cols) * 100))
        y = Math.min(97, Math.max(3, ((row + (random() * 1.3 - 0.15)) / rows) * 100))
        const clashes = points.some((p) => Math.hypot(p.x - x, p.y - y) < minSeparation)
        if (!clashes) break
      }
      points.push({ x: round1(x), y: round1(y) })
    }
  }

  return points
}

/**
 * Sorts points so each one is the furthest from every point already placed
 * (farthest-point / Mitchell's best-candidate).
 *
 * This is what makes truncation safe: every prefix of the result is spread over the
 * whole band, so hiding the tail on smaller screens thins the field evenly instead of
 * leaving a bare patch.
 */
/**
 * @param {Point[]} points
 * @param {number} xWeight
 * @returns {Point[]}
 */
function orderProgressively(points, xWeight) {
  /** @type {(a: Point, b: Point) => number} */
  const distanceSq = (a, b) => ((a.x - b.x) * xWeight) ** 2 + (a.y - b.y) ** 2
  const centre = { x: 50, y: 50 }

  const remaining = points.slice()
  // Start near the middle so the first few stars are not bunched against one edge.
  let index = 0
  remaining.forEach((p, i) => {
    if (distanceSq(p, centre) < distanceSq(remaining[index], centre)) index = i
  })
  const ordered = [remaining.splice(index, 1)[0]]

  while (remaining.length) {
    let bestIndex = 0
    let bestDistance = -1
    remaining.forEach((candidate, i) => {
      let nearest = Infinity
      for (const chosen of ordered) {
        const d = distanceSq(candidate, chosen)
        if (d < nearest) nearest = d
      }
      if (nearest > bestDistance) {
        bestDistance = nearest
        bestIndex = i
      }
    })
    ordered.push(remaining.splice(bestIndex, 1)[0])
  }

  return ordered
}

/**
 * Penalty score for a candidate layout — lower is better, 0 is clean.
 *
 * Every check runs at each visible count, because a layout that looks well spread at
 * 100 can be badly striped at 50. Both axes are checked independently: measuring only
 * vertical spread is exactly how the vertical-striping bug survived several rounds of
 * "verification".
 */
/**
 * @param {Point[]} points
 * @param {number[]} counts
 * @returns {number}
 */
function scoreLayout(points, counts) {
  const X_BINS = 20
  const Y_BINS = 8
  let penalty = 0

  for (const count of counts) {
    const visible = points.slice(0, count)
    const xBins = new Set(
      visible.map((p) => Math.min(X_BINS - 1, Math.floor(p.x / (100 / X_BINS))))
    )
    const yBins = new Set(
      visible.map((p) => Math.min(Y_BINS - 1, Math.floor(p.y / (100 / Y_BINS))))
    )

    // An empty band right across the field is the most visible failure, so weigh it heaviest.
    penalty += 40 * (X_BINS - xBins.size)
    penalty += 40 * (Y_BINS - yBins.size)

    const xs = visible.map((p) => p.x).sort((a, b) => a - b)
    const ys = visible.map((p) => p.y).sort((a, b) => a - b)
    penalty += 6 * Math.max(0, largestGap(xs) - 8)
    penalty += 6 * Math.max(0, largestGap(ys) - 14)

    // Pile-ups: one bin holding far more than its share reads as a clump.
    penalty += 3 * Math.max(0, busiestBin(visible, 'x', X_BINS) - (count / X_BINS) * 2)
    penalty += 3 * Math.max(0, busiestBin(visible, 'y', Y_BINS) - (count / Y_BINS) * 2)
  }

  return penalty
}

/**
 * @param {number[]} sorted
 * @returns {number}
 */
function largestGap(sorted) {
  let max = 0
  for (let i = 1; i < sorted.length; i++) max = Math.max(max, sorted[i] - sorted[i - 1])
  return max
}

/**
 * @param {Point[]} points
 * @param {'x' | 'y'} axis
 * @param {number} bins
 * @returns {number}
 */
function busiestBin(points, axis, bins) {
  /** @type {Map<number, number>} */
  const counts = new Map()
  for (const p of points) {
    const bin = Math.min(bins - 1, Math.floor(p[axis] / (100 / bins)))
    counts.set(bin, (counts.get(bin) || 0) + 1)
  }
  return Math.max(...counts.values())
}

/**
 * Assigns each star a radius and an animation delay.
 *
 * Radii are weighted small: most stars are faint specks and only a few are bright.
 * The largest tier is what the stylesheet draws as a four-point sparkle rather than a
 * glow, so keeping it rare is what makes it read as an accent.
 */
/**
 * @param {Point[]} points
 * @param {number} seed
 * @param {number} twinkleSeconds
 * @returns {Star[]}
 */
function assignAttributes(points, seed, twinkleSeconds) {
  const random = makeRandom(seed * 977 + 13)
  return points.map((p) => {
    const roll = random()
    const radius = roll < 0.55 ? 1 : roll < 0.8 ? 1.5 : roll < 0.94 ? 2 : 2.5
    return { x: p.x, y: p.y, radius, delay: round2(random() * twinkleSeconds) }
  })
}

/** Searches seeds and x-weights for the cleanest layout this grid can produce. */
/**
 * @param {number} seedBase
 * @param {number} cols
 * @param {number} rows
 * @param {number[]} counts
 * @param {number} minSeparation
 * @param {number} total
 * @returns {{ score: number, seed: number, xWeight: number, points: Point[] }}
 */
function findBestBand(seedBase, cols, rows, counts, minSeparation, total) {
  /** @type {{ score: number, seed: number, xWeight: number, points: Point[] } | null} */
  let best = null

  for (let i = 0; i < SEEDS_PER_BAND; i++) {
    const seed = seedBase + i
    const points = generatePoints(seed, cols, rows, minSeparation)
    for (const xWeight of X_WEIGHTS) {
      // Trim after ordering, so the stars dropped are the least spread-out ones.
      const ordered = orderProgressively(points, xWeight).slice(0, total)
      const score = scoreLayout(ordered, counts)
      if (!best || score < best.score) best = { score, seed, xWeight, points: ordered }
      if (score === 0) return best
    }
  }

  if (!best) throw new Error('No layout produced — check the grid and count arguments.')
  return best
}

/** Diagnostics for the finished band — the same checks used to catch past regressions. */
/**
 * @param {Star[]} stars
 * @param {number[]} counts
 */
function inspect(stars, counts) {
  /** @type {{ count: number, emptyX: number, emptyY: number, maxXGap: number, maxYGap: number, sparklePercent: number }[]} */
  const rows = []

  // A constant step between consecutive stars means they sit on a lattice, which looks
  // obviously regular on screen while passing per-axis evenness checks.
  /** @type {Map<string, number>} */
  const deltas = new Map()
  for (let i = 1; i < stars.length; i++) {
    const key = `${round1(stars[i].x - stars[i - 1].x)},${round1(stars[i].y - stars[i - 1].y)}`
    deltas.set(key, (deltas.get(key) || 0) + 1)
  }
  const repeated = Math.max(...deltas.values())

  let closest = Infinity
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      closest = Math.min(closest, Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y))
    }
  }

  for (const count of counts) {
    const visible = stars.slice(0, count)
    const xBins = new Set(visible.map((p) => Math.min(19, Math.floor(p.x / 5))))
    const yBins = new Set(visible.map((p) => Math.min(7, Math.floor(p.y / 12.5))))
    const xs = visible.map((p) => p.x).sort((a, b) => a - b)
    const ys = visible.map((p) => p.y).sort((a, b) => a - b)
    const sparkles = visible.filter((p) => p.radius >= 2.1).length
    rows.push({
      count,
      emptyX: 20 - xBins.size,
      emptyY: 8 - yBins.size,
      maxXGap: round1(largestGap(xs)),
      maxYGap: round1(largestGap(ys)),
      sparklePercent: Math.round((sparkles / count) * 100),
    })
  }

  return { repeated, closest: round2(closest), rows }
}

/** Draws the band as text so the layout can be eyeballed, not just measured. */
/**
 * @param {Star[]} stars
 * @param {number} count
 * @param {number} [width]
 * @param {number} [height]
 * @returns {string}
 */
function render(stars, count, width = 100, height = 22) {
  const grid = Array.from({ length: height }, () => new Array(width).fill(' '))
  for (const star of stars.slice(0, count)) {
    const gx = Math.min(width - 1, Math.floor((star.x / 100) * width))
    const gy = Math.min(height - 1, Math.floor((star.y / 100) * height))
    grid[gy][gx] = star.radius >= 2.1 ? '+' : '*'
  }
  return grid.map((row) => `  |${row.join('')}|`).join('\n')
}

/**
 * @param {number} n
 * @returns {number}
 */
function round1(n) {
  return Math.round(n * 10) / 10
}
/**
 * @param {number} n
 * @returns {number}
 */
function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * @param {Star[]} stars
 * @param {string} name
 * @returns {string}
 */
function formatBand(stars, name) {
  const lines = stars.map(
    (s) => `  { x: ${s.x}, y: ${s.y}, radius: ${s.radius}, delay: ${s.delay} },`
  )
  return [`export const ${name}: Star[] = [`, ...lines, ']'].join('\n')
}

/**
 * @param {Star[]} upper
 * @param {Star[]} lower
 * @param {Counts} counts
 * @param {Grid} grid
 * @returns {string}
 */
function buildFile(upper, lower, counts, grid) {
  return `/**
 * Star positions for the animated star field, split into an upper and a lower band.
 *
 * GENERATED FILE — edit \`scripts/generate-star-field.js\` and run \`npm run generate-stars\`
 * rather than editing by hand. Hand-tuning a position is fine in isolation, but the
 * layout has properties the generator enforces which are easy to break by eye; the
 * script prints what it checked.
 *
 * Positions are fixed rather than randomly generated so the field is identical on the
 * server and the client (a random layout would hydrate mismatched) and stable across
 * re-renders. \`x\` is a percentage of the band's width, \`y\` a percentage of its height.
 *
 * \`delay\` staggers each star's twinkle so the band shimmers instead of pulsing as one.
 *
 * Each band holds the full desktop count. Narrower screens render the same list and
 * hide the tail with \`nth-child\`, so the count is a pure CSS tier switch with no
 * resize listener and no server/client mismatch — see \`index.module.scss\` and
 * \`STAR_COUNTS\` below.
 *
 * Because of that truncation the *order* matters as much as the positions: the list is
 * sorted so each star is the one furthest from all the stars before it. Any prefix is
 * therefore spread over the whole band, and cutting to ${counts.mobile} thins the field
 * evenly instead of leaving bare patches.
 *
 * Generated as a jittered ${grid.cols}x${grid.rows} grid — one star randomly placed per
 * cell, the jitter overspilling its cell so neighbours overlap and no gutters show
 * between rows, with a minimum-separation retry so no two stars merge into one blob.
 * Any cells beyond the star count are trimmed after ordering, so the dropped ones are
 * the least spread-out.
 * Seeds are then searched for the layout whose every truncation leaves no empty band on
 * *either* axis.
 *
 * Two failure modes worth knowing, both of which looked fine by some measure while
 * being obvious on screen:
 *  - A constant step between consecutive stars (two golden-ratio series, say) passes
 *    per-column evenness checks while placing every star on one diagonal lattice.
 *  - Down-weighting x in the furthest-point ordering treats horizontal gaps as cheap,
 *    so prefixes stack into vertical stripes with dead space between them, all while
 *    scoring perfectly on vertical spread.
 */
export interface Star {
  x: number
  y: number
  radius: number
  delay: number
}

/**
 * How many of each band's stars are visible per breakpoint. Kept here next to the data
 * as the reference for the \`nth-child\` cutoffs in the stylesheet, which have to be
 * literal numbers.
 */
export const STAR_COUNTS = {
  mobile: ${counts.mobile},
  tablet: ${counts.tablet},
  desktop: ${counts.desktop},
} as const

${formatBand(upper, 'UPPER_STARS')}

${formatBand(lower, 'LOWER_STARS')}
`
}

/**
 * @param {string[]} argv
 * @returns {{ preview: boolean, counts: Partial<Counts>, grid: Grid | null }}
 */
function parseArgs(argv) {
  /** @type {{ preview: boolean, counts: Partial<Counts>, grid: Grid | null }} */
  const args = { preview: false, counts: {}, grid: null }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--preview') args.preview = true
    else if (arg === '--mobile') args.counts.mobile = Number(argv[++i])
    else if (arg === '--tablet') args.counts.tablet = Number(argv[++i])
    else if (arg === '--desktop') args.counts.desktop = Number(argv[++i])
    else if (arg === '--grid') {
      const [cols, rows] = argv[++i].split('x').map(Number)
      args.grid = { cols, rows }
    } else {
      console.error(`❌ Unknown argument: ${arg}`)
      process.exit(1)
    }
  }
  return args
}

/** Reads the counts currently in the generated file, so a run with no flags is a no-op. */
/**
 * @returns {Counts}
 */
function readCurrentCounts() {
  const source = fs.readFileSync(OUTPUT_FILE, 'utf-8')
  /** @type {(key: string) => number} */
  const read = (key) => {
    const match = source.match(new RegExp(`${key}:\\s*(\\d+)`))
    if (!match) throw new Error(`Could not read the current ${key} count from ${OUTPUT_FILE}`)
    return Number(match[1])
  }
  return { mobile: read('mobile'), tablet: read('tablet'), desktop: read('desktop') }
}

/**
 * Picks a grid holding at least `total` cells, shaped near 1.6:1.
 *
 * The grid may hold more cells than there are stars; the extras are trimmed after
 * ordering, which costs nothing because the ordering already puts the most
 * spread-out points first. That way any star count works, not just ones with
 * convenient factors.
 */
/**
 * @param {number} total
 * @returns {Grid}
 */
function chooseGrid(total) {
  /** @type {{ cols: number, rows: number, error: number } | null} */
  let best = null
  for (let rows = 4; rows <= 60; rows++) {
    const cols = Math.ceil(total / rows)
    if (cols < 4) continue
    const waste = cols * rows - total
    if (waste > rows) continue
    const error = Math.abs(cols / rows - 1.6) + waste * 0.05
    if (!best || error < best.error) best = { cols, rows, error }
  }
  return best ? { cols: best.cols, rows: best.rows } : { cols: 10, rows: 10 }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const current = readCurrentCounts()
  const counts = {
    mobile: args.counts.mobile ?? current.mobile,
    tablet: args.counts.tablet ?? current.tablet,
    desktop: args.counts.desktop ?? current.desktop,
  }

  if (!(counts.mobile <= counts.tablet && counts.tablet <= counts.desktop)) {
    console.error(
      `❌ Counts must increase: mobile (${counts.mobile}) <= tablet (${counts.tablet}) <= desktop (${counts.desktop})`
    )
    process.exit(1)
  }

  const grid = args.grid ?? chooseGrid(counts.desktop)
  const cells = grid.cols * grid.rows
  if (cells < counts.desktop) {
    console.error(
      `❌ Grid ${grid.cols}x${grid.rows} holds only ${cells} cells, fewer than the ` +
        `desktop count of ${counts.desktop}. Pass a larger --grid <cols>x<rows>.`
    )
    process.exit(1)
  }

  // A denser field cannot honour the separation a sparse one can.
  const minSeparation = round2(MIN_SEPARATION_AT_100 * Math.sqrt(100 / counts.desktop))
  const tiers = [counts.mobile, counts.tablet, counts.desktop]

  console.log(
    `✨ Generating ${counts.desktop} stars per band ` +
      `(mobile ${counts.mobile} / tablet ${counts.tablet} / desktop ${counts.desktop})`
  )
  console.log(`   grid ${grid.cols}x${grid.rows}, min separation ${minSeparation}`)

  const bands = [
    { name: 'UPPER_STARS', seedBase: 2000 },
    { name: 'LOWER_STARS', seedBase: 6000 },
  ].map((band) => {
    const best = findBestBand(
      band.seedBase,
      grid.cols,
      grid.rows,
      tiers,
      minSeparation,
      counts.desktop
    )
    const stars = assignAttributes(best.points, best.seed, 3.5)
    return { ...band, ...best, stars }
  })

  let clean = true
  for (const band of bands) {
    const report = inspect(band.stars, tiers)
    const ok = band.score === 0
    if (!ok) clean = false
    console.log(
      `\n${ok ? '✅' : '⚠️ '} ${band.name} — seed ${band.seed}, x-weight ${band.xWeight}, penalty ${band.score}`
    )
    console.log(
      `   repeated step ${report.repeated}/${band.stars.length - 1} (>1 hints at a lattice)` +
        `, closest pair ${report.closest}`
    )
    for (const row of report.rows) {
      console.log(
        `   n=${String(row.count).padStart(4)}: empty x-bands ${row.emptyX}, y-bands ${row.emptyY}` +
          ` | max gap x ${row.maxXGap} y ${row.maxYGap} | sparkles ${row.sparklePercent}%`
      )
    }
    console.log(`   layout at n=${counts.mobile} ('+' = sparkle):`)
    console.log(render(band.stars, counts.mobile))
  }

  if (!clean) {
    console.log(
      '\n⚠️  A band scored above zero: it has an empty band, an oversized gap, or a clump\n' +
        '    at one of the counts. Look at the layouts above — often a nearby desktop count\n' +
        '    with better grid factors scores clean.'
    )
  }

  if (args.preview) {
    console.log('\n👀 Preview only — nothing written.')
    return
  }

  fs.writeFileSync(OUTPUT_FILE, buildFile(bands[0].stars, bands[1].stars, counts, grid), 'utf-8')
  console.log(`\n💾 Wrote ${path.relative(process.cwd(), OUTPUT_FILE)}`)

  if (
    current.mobile !== counts.mobile ||
    current.tablet !== counts.tablet ||
    current.desktop !== counts.desktop
  ) {
    console.log(
      `\n📐 Counts changed — update the cutoffs in StarField/index.module.scss:\n` +
        `     @media (max-width: $breakpoint-tablet)  ->  .star:nth-child(n + ${counts.tablet + 1})\n` +
        `     @media (max-width: $breakpoint-mobile)  ->  .star:nth-child(n + ${counts.mobile + 1})`
    )
  }

  console.log('\n🎨 Run `npm run format` to match Prettier, then check the pages in the browser.')
}

main()
