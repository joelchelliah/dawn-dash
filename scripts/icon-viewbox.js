#!/usr/bin/env node

/**
 * Prints a table of viewBox values for scaling an icon in src/shared/components/Icons.
 *
 * An icon's apparent size is driven by its "fill" — how much of the rendered box is ink rather
 * than transparent margin. Two icons with the same CSS width can look very different if one has
 * a lot of dead space in its viewBox. Cropping the viewBox raises the fill, so the icon looks
 * bigger without touching any CSS.
 *
 * Usage:
 *   node scripts/icon-viewbox.js PawIcon
 *   node scripts/icon-viewbox.js src/shared/components/Icons/SkullIcon.tsx
 *
 * Caveats: bounds come from path endpoints and control points, not a real curve solve. Curves that
 * bulge past their endpoints read slightly small, and dense paths whose control points sit outside
 * the visible shape read large (GitHubIcon reports over 100%). Treat the numbers as a starting
 * point, leave a little margin rather than cropping to the reported minimum, and check the browser.
 *
 * Note these icons are shared: changing a viewBox affects every consumer. Use the per-consumer
 * `svg { width/height }` in a stylesheet when only one place should change.
 */

const fs = require('fs')
const path = require('path')

const ICONS_DIR = path.join(__dirname, '../src/shared/components/Icons')
const FILL_STEPS = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6]

function resolveIconPath(arg) {
  if (arg.endsWith('.tsx')) return path.resolve(arg)

  const name = arg.endsWith('Icon') ? arg : `${arg}Icon`
  return path.join(ICONS_DIR, `${name}.tsx`)
}

function parseViewBox(src) {
  const match = src.match(/viewBox="([-\d.\s]+)"/)
  if (!match) throw new Error('No viewBox found')

  const [x, y, width, height] = match[1].trim().split(/\s+/).map(Number)
  return { x, y, width, height }
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}="([-\\d.]+)"`))
  return match ? Number(match[1]) : null
}

/** Vertical extent of the non-path shapes: <ellipse>, <circle>, <rect> and <line>. */
function shapeBounds(src) {
  const ys = []

  for (const [tag] of src.matchAll(/<(?:ellipse|circle|rect|line)\b[^>]*>/g)) {
    if (tag.startsWith('<ellipse') || tag.startsWith('<circle')) {
      const cy = attr(tag, 'cy')
      const radius = tag.startsWith('<circle') ? attr(tag, 'r') : attr(tag, 'ry')
      if (cy !== null && radius !== null) ys.push(cy - radius, cy + radius)
    } else if (tag.startsWith('<rect')) {
      const y = attr(tag, 'y')
      const height = attr(tag, 'height')
      if (y !== null && height !== null) ys.push(y, y + height)
    } else {
      const y1 = attr(tag, 'y1')
      const y2 = attr(tag, 'y2')
      if (y1 !== null) ys.push(y1)
      if (y2 !== null) ys.push(y2)
    }
  }

  return ys
}

// Y offset within each command's argument list, and the total argument count.
// `null` means the command does not move vertically.
const PATH_COMMANDS = {
  M: { yOffset: 1, argCount: 2 },
  L: { yOffset: 1, argCount: 2 },
  T: { yOffset: 1, argCount: 2 },
  V: { yOffset: 0, argCount: 1 },
  H: { yOffset: null, argCount: 1 },
  Q: { yOffset: 3, argCount: 4 },
  S: { yOffset: 3, argCount: 4 },
  C: { yOffset: 5, argCount: 6 },
  A: { yOffset: 6, argCount: 7 },
}

/**
 * Y coordinates visited by each path's commands. Only endpoints and control points are sampled,
 * which is why curved shapes can read slightly small — see the caveat in the header.
 *
 * Handles both absolute (uppercase) and relative (lowercase) commands; the skull, for instance,
 * is written entirely in relative curves and arcs.
 */
function pathBounds(src) {
  const ys = []

  for (const [, d] of src.matchAll(/\sd="([^"]+)"/g)) {
    // Numbers may be written as `.9`, `-3.31` or `2.12` and run together without separators.
    const tokens = d.match(/[A-Za-z]|-?(?:\d*\.\d+|\d+)/g) || []

    let i = 0
    let command = null
    let isRelative = false
    let y = 0

    while (i < tokens.length) {
      if (/[A-Za-z]/.test(tokens[i])) {
        const raw = tokens[i]
        command = raw.toUpperCase()
        isRelative = raw !== command
        i += 1
        if (command === 'Z') continue
      }

      const shape = PATH_COMMANDS[command]
      if (!shape) {
        i += 1
        continue
      }

      if (i + shape.argCount > tokens.length) break

      if (shape.yOffset !== null) {
        const value = Number(tokens[i + shape.yOffset])
        // A relative command's arguments are offsets from the current point, not absolute
        // coordinates — treating them as absolute is what produced NaN/garbage bounds.
        y = isRelative ? y + value : value
      }

      i += shape.argCount
      ys.push(y)
    }
  }

  return ys
}

function strokePadding(src) {
  const match = src.match(/strokeWidth="([\d.]+)"/)
  return match ? Number(match[1]) / 2 : 0
}

function round(value) {
  return Number(value.toFixed(2))
}

function formatViewBox({ x, y, width, height }) {
  return `${round(x)} ${round(y)} ${round(width)} ${round(height)}`
}

/** Scales a viewBox about the content centre to hit a target fill. */
function viewBoxForFill(current, content, fill, isSquare) {
  const height = content.height / fill

  if (isSquare) {
    return {
      x: content.centreX - height / 2,
      y: content.centreY - height / 2,
      width: height,
      height,
    }
  }

  // Non-square icons keep their aspect ratio, so width scales by the same factor as height.
  const width = current.width * (height / current.height)
  return {
    x: current.x + (current.width - width) / 2,
    y: content.centreY - height / 2,
    width,
    height,
  }
}

function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: node scripts/icon-viewbox.js <IconName|path/to/Icon.tsx>')
    process.exit(1)
  }

  const iconPath = resolveIconPath(arg)
  if (!fs.existsSync(iconPath)) {
    console.error(`Not found: ${iconPath}`)
    process.exit(1)
  }

  const src = fs.readFileSync(iconPath, 'utf8')
  const viewBox = parseViewBox(src)

  const padding = strokePadding(src)
  const ys = [...shapeBounds(src), ...pathBounds(src)]
  if (!ys.length) {
    console.error('Could not find any shape or path geometry to measure.')
    process.exit(1)
  }

  const top = Math.min(...ys) - padding
  const bottom = Math.max(...ys) + padding
  const content = {
    height: bottom - top,
    centreX: viewBox.x + viewBox.width / 2,
    centreY: (top + bottom) / 2,
  }

  const currentFill = content.height / viewBox.height
  const isSquare = Math.abs(viewBox.width - viewBox.height) < 0.01

  console.log(`\n${path.basename(iconPath)}`)
  console.log(`  viewBox      ${formatViewBox(viewBox)}${isSquare ? '' : '   (non-square)'}`)
  console.log(`  content y    ${round(top)} .. ${round(bottom)}  (height ${round(content.height)})`)
  console.log(`  centre       (${round(content.centreX)}, ${round(content.centreY)})`)
  console.log(`  current fill ${Math.round(currentFill * 100)}%`)

  console.log('\n  Fill   Bigger icon <-- --> Smaller icon')
  console.log('  ----   ---------------------------------')

  for (const fill of FILL_STEPS) {
    const candidate = viewBoxForFill(viewBox, content, fill, isSquare)
    const isCurrent = Math.abs(fill - currentFill) < 0.005
    const clips = candidate.height < content.height
    const note = isCurrent ? '  <- current' : clips ? '  (clips!)' : ''
    console.log(
      `  ${String(Math.round(fill * 100)).padStart(3)}%   ${formatViewBox(candidate)}${note}`
    )
  }

  console.log('\n  Higher fill = less margin = icon looks bigger. Keep square icons square.')
  console.log('  Bounds ignore curve bulge, so verify in the browser after changing.\n')
}

main()
