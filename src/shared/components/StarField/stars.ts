/**
 * Star positions for the animated star field, split into an upper and a lower band.
 *
 * GENERATED FILE — edit `scripts/generate-star-field.js` and run `npm run generate-stars`
 * rather than editing by hand. Hand-tuning a position is fine in isolation, but the
 * layout has properties the generator enforces which are easy to break by eye; the
 * script prints what it checked.
 *
 * Positions are fixed rather than randomly generated so the field is identical on the
 * server and the client (a random layout would hydrate mismatched) and stable across
 * re-renders. `x` is a percentage of the band's width, `y` a percentage of its height.
 *
 * `delay` staggers each star's twinkle so the band shimmers instead of pulsing as one.
 *
 * Each band holds the full desktop count. Narrower screens render the same list and
 * hide the tail with `nth-child`, so the count is a pure CSS tier switch with no
 * resize listener and no server/client mismatch — see `index.module.scss` and
 * `STAR_COUNTS` below.
 *
 * Because of that truncation the *order* matters as much as the positions: the list is
 * sorted so each star is the one furthest from all the stars before it. Any prefix is
 * therefore spread over the whole band, and cutting to 50 thins the field
 * evenly instead of leaving bare patches.
 *
 * Generated as a jittered 13x8 grid — one star randomly placed per
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
 * as the reference for the `nth-child` cutoffs in the stylesheet, which have to be
 * literal numbers.
 */
export const STAR_COUNTS = {
  mobile: 50,
  tablet: 75,
  desktop: 100,
} as const

export const UPPER_STARS: Star[] = [
  { x: 50.3, y: 50.8, radius: 1, delay: 2.03 },
  { x: 1, y: 6.1, radius: 1, delay: 0.5 },
  { x: 99, y: 92.4, radius: 2, delay: 1.35 },
  { x: 93.8, y: 3.8, radius: 1, delay: 0.69 },
  { x: 1.5, y: 88.8, radius: 2, delay: 1.02 },
  { x: 55.8, y: 97, radius: 1, delay: 0.33 },
  { x: 55.9, y: 5.3, radius: 1, delay: 1.45 },
  { x: 93.4, y: 48.6, radius: 1, delay: 1.09 },
  { x: 17.3, y: 51.6, radius: 1.5, delay: 3.42 },
  { x: 30.3, y: 81.9, radius: 1, delay: 0.84 },
  { x: 72.6, y: 68.7, radius: 1.5, delay: 2.47 },
  { x: 30.1, y: 3, radius: 1, delay: 1.68 },
  { x: 69.9, y: 30.3, radius: 1, delay: 1.67 },
  { x: 19.1, y: 25.7, radius: 1, delay: 2.89 },
  { x: 1, y: 65.3, radius: 2, delay: 2.68 },
  { x: 80.6, y: 97, radius: 1, delay: 0.7 },
  { x: 45.7, y: 23.8, radius: 2.5, delay: 0.92 },
  { x: 98.6, y: 24.5, radius: 1, delay: 3.28 },
  { x: 32.9, y: 41.1, radius: 1, delay: 2.38 },
  { x: 96, y: 71.5, radius: 1, delay: 0.18 },
  { x: 1.3, y: 44, radius: 2, delay: 1.05 },
  { x: 71.5, y: 8.6, radius: 1, delay: 3.3 },
  { x: 57.2, y: 71.9, radius: 1, delay: 1.25 },
  { x: 18.2, y: 70.3, radius: 2, delay: 1.82 },
  { x: 70.9, y: 48.1, radius: 1, delay: 0.46 },
  { x: 40.4, y: 63.8, radius: 2, delay: 0.33 },
  { x: 86.3, y: 33.1, radius: 2, delay: 2.78 },
  { x: 15, y: 3.4, radius: 2.5, delay: 2.89 },
  { x: 47.3, y: 83.2, radius: 2.5, delay: 2.24 },
  { x: 13.5, y: 96.5, radius: 1.5, delay: 1.19 },
  { x: 83.9, y: 13.8, radius: 1, delay: 0.1 },
  { x: 38.7, y: 93.9, radius: 1.5, delay: 2.61 },
  { x: 56.2, y: 30.9, radius: 2.5, delay: 3.15 },
  { x: 67.3, y: 93.2, radius: 1, delay: 2.83 },
  { x: 85.4, y: 65.2, radius: 2, delay: 1.06 },
  { x: 7.9, y: 29.7, radius: 2, delay: 2.1 },
  { x: 29.5, y: 61, radius: 1, delay: 0.42 },
  { x: 45.1, y: 39.1, radius: 1, delay: 0.15 },
  { x: 5.3, y: 17.6, radius: 1.5, delay: 0.46 },
  { x: 55.5, y: 18.5, radius: 2, delay: 0.65 },
  { x: 89.8, y: 86.9, radius: 1, delay: 2.05 },
  { x: 36.1, y: 21, radius: 1.5, delay: 3.14 },
  { x: 61, y: 61.2, radius: 1.5, delay: 0.48 },
  { x: 75.4, y: 19.3, radius: 1, delay: 2.54 },
  { x: 9.6, y: 75.4, radius: 1.5, delay: 0.86 },
  { x: 80.2, y: 45.5, radius: 1.5, delay: 2.93 },
  { x: 72.3, y: 79.7, radius: 1, delay: 0.03 },
  { x: 9.1, y: 56.3, radius: 1, delay: 2.92 },
  { x: 36.1, y: 73.4, radius: 1, delay: 2.23 },
  { x: 24, y: 41.3, radius: 1, delay: 1.9 },
  { x: 93.9, y: 15.7, radius: 2, delay: 0.63 },
  { x: 45.5, y: 13.4, radius: 1, delay: 1.21 },
  { x: 55.3, y: 85.2, radius: 1, delay: 0.46 },
  { x: 38, y: 4.4, radius: 1, delay: 2.44 },
  { x: 77.6, y: 36.9, radius: 1.5, delay: 2.17 },
  { x: 79.2, y: 73, radius: 1, delay: 1.31 },
  { x: 66.6, y: 40.8, radius: 2, delay: 2.01 },
  { x: 55.3, y: 44.2, radius: 1.5, delay: 2.37 },
  { x: 88.5, y: 78.5, radius: 1, delay: 2.41 },
  { x: 31.6, y: 94.5, radius: 1, delay: 2.02 },
  { x: 19.1, y: 35.4, radius: 1, delay: 3.44 },
  { x: 86.9, y: 3, radius: 1, delay: 1.52 },
  { x: 66.5, y: 75.5, radius: 1.5, delay: 2.74 },
  { x: 88.3, y: 57.9, radius: 1, delay: 3.49 },
  { x: 96, y: 63.5, radius: 2, delay: 2.24 },
  { x: 66.3, y: 3.6, radius: 1, delay: 1.1 },
  { x: 23.7, y: 4.9, radius: 1, delay: 3.22 },
  { x: 46.1, y: 67.1, radius: 1, delay: 3.15 },
  { x: 78.1, y: 52.4, radius: 2.5, delay: 0.44 },
  { x: 74.5, y: 97, radius: 2, delay: 2.04 },
  { x: 9.8, y: 36.6, radius: 1, delay: 3.03 },
  { x: 18.3, y: 77.5, radius: 1, delay: 1.45 },
  { x: 14.9, y: 89.7, radius: 1.5, delay: 3.49 },
  { x: 52.4, y: 10.9, radius: 1.5, delay: 1.99 },
  { x: 33.8, y: 56.3, radius: 1, delay: 2.7 },
  { x: 37, y: 36.2, radius: 1.5, delay: 0.88 },
  { x: 60.6, y: 26.8, radius: 2, delay: 0.08 },
  { x: 95.1, y: 85.3, radius: 1, delay: 0.06 },
  { x: 10.9, y: 24.3, radius: 1, delay: 3.3 },
  { x: 11.4, y: 8.1, radius: 1, delay: 0.54 },
  { x: 7.2, y: 62.2, radius: 1, delay: 1.43 },
  { x: 26.4, y: 56, radius: 1, delay: 2.58 },
  { x: 52.7, y: 35.5, radius: 1, delay: 0.25 },
  { x: 30.9, y: 88.4, radius: 1.5, delay: 1.36 },
  { x: 45.2, y: 51.1, radius: 2, delay: 1.99 },
  { x: 9.2, y: 69.3, radius: 2, delay: 1.9 },
  { x: 8.5, y: 97, radius: 1, delay: 0.4 },
  { x: 23.3, y: 28.5, radius: 1, delay: 2.82 },
  { x: 56.5, y: 59.4, radius: 1, delay: 2.88 },
  { x: 85.5, y: 89.1, radius: 1.5, delay: 0.21 },
  { x: 79.9, y: 12.3, radius: 1.5, delay: 3.11 },
  { x: 41.6, y: 36.4, radius: 1.5, delay: 0.42 },
  { x: 74.1, y: 51.8, radius: 1, delay: 3.11 },
  { x: 54.5, y: 89.8, radius: 1.5, delay: 0.53 },
  { x: 77.3, y: 32.4, radius: 1, delay: 1.57 },
  { x: 50.3, y: 85.6, radius: 1, delay: 0.11 },
  { x: 96.9, y: 48.2, radius: 2, delay: 3.24 },
  { x: 15.8, y: 24.5, radius: 2, delay: 2.06 },
  { x: 63.7, y: 63.4, radius: 1, delay: 1.67 },
  { x: 26, y: 38.3, radius: 1.5, delay: 1.87 },
]

export const LOWER_STARS: Star[] = [
  { x: 52.8, y: 48.6, radius: 1, delay: 3.22 },
  { x: 5.1, y: 97, radius: 2, delay: 2.79 },
  { x: 5.6, y: 3, radius: 1, delay: 1.17 },
  { x: 98.3, y: 93.7, radius: 1.5, delay: 1.59 },
  { x: 99, y: 9.6, radius: 1, delay: 3.46 },
  { x: 46.8, y: 97, radius: 1, delay: 3.3 },
  { x: 54.6, y: 3, radius: 2, delay: 1.98 },
  { x: 14, y: 52.8, radius: 2, delay: 3.15 },
  { x: 99, y: 50.3, radius: 1, delay: 1.68 },
  { x: 75.5, y: 28.3, radius: 1.5, delay: 1.88 },
  { x: 74.3, y: 69, radius: 2.5, delay: 3.37 },
  { x: 33.8, y: 28.7, radius: 1, delay: 1.85 },
  { x: 34.1, y: 71.9, radius: 1.5, delay: 1.2 },
  { x: 4.4, y: 29.2, radius: 1, delay: 1.04 },
  { x: 30.4, y: 3, radius: 1.5, delay: 3.12 },
  { x: 77.1, y: 97, radius: 1, delay: 1.62 },
  { x: 77.5, y: 3, radius: 1, delay: 3.32 },
  { x: 54.2, y: 74.1, radius: 1, delay: 3.12 },
  { x: 27.2, y: 95.6, radius: 1.5, delay: 2.75 },
  { x: 59.2, y: 25.6, radius: 1.5, delay: 0.64 },
  { x: 1, y: 63.7, radius: 2.5, delay: 0.17 },
  { x: 69.3, y: 51.4, radius: 1.5, delay: 1.27 },
  { x: 62.5, y: 90.9, radius: 1.5, delay: 1.29 },
  { x: 18.3, y: 22.2, radius: 1.5, delay: 0.54 },
  { x: 84.7, y: 55.6, radius: 1.5, delay: 2 },
  { x: 38.1, y: 48.9, radius: 1, delay: 0.75 },
  { x: 7.9, y: 79.1, radius: 1, delay: 1.98 },
  { x: 19.1, y: 69.1, radius: 2.5, delay: 0.02 },
  { x: 85.2, y: 39.3, radius: 2.5, delay: 1.2 },
  { x: 45.8, y: 22.2, radius: 1, delay: 3.21 },
  { x: 14.3, y: 38.4, radius: 1.5, delay: 1.68 },
  { x: 42.3, y: 3, radius: 1, delay: 1.87 },
  { x: 84.3, y: 14.6, radius: 1, delay: 0.45 },
  { x: 15.6, y: 89.8, radius: 1, delay: 0.43 },
  { x: 27.6, y: 54.8, radius: 1.5, delay: 0.81 },
  { x: 64.1, y: 10.5, radius: 1.5, delay: 1.46 },
  { x: 3.8, y: 47.8, radius: 1.5, delay: 2.37 },
  { x: 68.4, y: 38.3, radius: 1, delay: 1.45 },
  { x: 43.9, y: 59.5, radius: 1, delay: 1.59 },
  { x: 24, y: 82.4, radius: 1, delay: 2.2 },
  { x: 16, y: 3, radius: 1.5, delay: 3.1 },
  { x: 93.3, y: 20.3, radius: 2.5, delay: 0.84 },
  { x: 92.3, y: 63.5, radius: 1, delay: 0.74 },
  { x: 69.6, y: 82.5, radius: 1, delay: 0.29 },
  { x: 83.5, y: 88.7, radius: 1, delay: 1.18 },
  { x: 61.8, y: 67.6, radius: 1, delay: 2 },
  { x: 83.2, y: 70.1, radius: 1, delay: 2.34 },
  { x: 8.8, y: 13, radius: 1.5, delay: 1.62 },
  { x: 49.1, y: 86.8, radius: 2, delay: 2.5 },
  { x: 97.6, y: 83.2, radius: 1.5, delay: 1.32 },
  { x: 53, y: 13.3, radius: 1, delay: 1 },
  { x: 49.4, y: 31.4, radius: 2, delay: 0.29 },
  { x: 24.2, y: 29.4, radius: 1, delay: 1.52 },
  { x: 38.3, y: 36.8, radius: 1, delay: 3.03 },
  { x: 11.9, y: 65.2, radius: 1, delay: 1.36 },
  { x: 39, y: 95.7, radius: 1, delay: 1.83 },
  { x: 92, y: 5.6, radius: 1.5, delay: 0.7 },
  { x: 54.2, y: 39.8, radius: 1, delay: 2.27 },
  { x: 22.5, y: 15, radius: 2, delay: 0.17 },
  { x: 46.9, y: 67.4, radius: 2.5, delay: 0.3 },
  { x: 81.4, y: 23.3, radius: 1.5, delay: 3.04 },
  { x: 91.8, y: 42.6, radius: 1, delay: 2.22 },
  { x: 57.5, y: 81.7, radius: 1, delay: 2.42 },
  { x: 39.2, y: 19.8, radius: 2, delay: 2.3 },
  { x: 15.9, y: 13.2, radius: 1.5, delay: 2.18 },
  { x: 91.6, y: 86.8, radius: 1, delay: 0.02 },
  { x: 50.2, y: 57.1, radius: 2, delay: 1.63 },
  { x: 59.3, y: 49.9, radius: 1, delay: 0.5 },
  { x: 28.6, y: 10, radius: 1, delay: 0.6 },
  { x: 68.3, y: 75.5, radius: 2, delay: 2.9 },
  { x: 30.9, y: 60.7, radius: 2.5, delay: 1.86 },
  { x: 82.9, y: 5.6, radius: 2, delay: 2.14 },
  { x: 14.7, y: 96.3, radius: 1, delay: 1.11 },
  { x: 21.3, y: 3, radius: 1.5, delay: 2.52 },
  { x: 73.6, y: 39.5, radius: 1, delay: 0.95 },
  { x: 16.2, y: 44.1, radius: 1.5, delay: 0.39 },
  { x: 64.1, y: 47.8, radius: 1, delay: 0.98 },
  { x: 85.4, y: 94.3, radius: 1.5, delay: 0.11 },
  { x: 55.1, y: 22.1, radius: 1.5, delay: 0.19 },
  { x: 49.4, y: 74.8, radius: 1, delay: 1.16 },
  { x: 67.5, y: 87.7, radius: 2, delay: 0.55 },
  { x: 24.1, y: 50.9, radius: 1, delay: 2.18 },
  { x: 85.6, y: 65.5, radius: 1, delay: 2.18 },
  { x: 11.2, y: 82.8, radius: 1, delay: 3.27 },
  { x: 80.8, y: 39, radius: 1.5, delay: 2.06 },
  { x: 79.3, y: 30.8, radius: 1.5, delay: 2.62 },
  { x: 6.6, y: 51.7, radius: 1.5, delay: 3.09 },
  { x: 91.6, y: 37.5, radius: 2.5, delay: 1.23 },
  { x: 92.1, y: 91.8, radius: 2, delay: 0.65 },
  { x: 18.7, y: 64.1, radius: 2, delay: 3.28 },
  { x: 62.6, y: 22.8, radius: 1, delay: 2.21 },
  { x: 45.5, y: 32.3, radius: 1, delay: 1.42 },
  { x: 75.4, y: 23.7, radius: 1, delay: 2.26 },
  { x: 92.7, y: 59.1, radius: 1, delay: 0.17 },
  { x: 65.9, y: 53, radius: 1.5, delay: 0.4 },
  { x: 54.8, y: 7.2, radius: 1, delay: 3.43 },
  { x: 22.6, y: 68.9, radius: 2.5, delay: 1.52 },
  { x: 35.1, y: 75.8, radius: 2, delay: 2.84 },
  { x: 46.2, y: 88.6, radius: 1.5, delay: 2.4 },
  { x: 43.6, y: 97, radius: 2, delay: 0.96 },
]
