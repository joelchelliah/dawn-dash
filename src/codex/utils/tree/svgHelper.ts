import { select, Selection } from 'd3-selection'

interface TreeSvgConfig {
  width: number
  height: number
  zoomScale: number | undefined
  offsetX: number
  offsetY: number
  preserveAspectRatio: 'xMinYMin meet' | 'xMidYMin meet'
}

/**
 * Sizes a tree SVG and creates the defs + zoomed/offset content group,
 * shared by the talent and event tree renderers.
 *
 * - With a zoomScale: explicit scaled pixel dimensions (no viewBox).
 * - Without: a viewBox so the tree scales to fit its container.
 *
 * The caller is responsible for clearing the SVG first (the event tree
 * must clear before measuring its container for zoom calculations).
 */
export function setupTreeSvg(
  svgElement: SVGSVGElement,
  { width, height, zoomScale, offsetX, offsetY, preserveAspectRatio }: TreeSvgConfig
): {
  defs: Selection<SVGDefsElement, unknown, null, undefined>
  contentGroup: Selection<SVGGElement, unknown, null, undefined>
} {
  const svg = select(svgElement)

  if (zoomScale) {
    // When zoomed: remove viewBox, set explicit scaled dimensions
    svg
      .attr('width', width * zoomScale)
      .attr('height', height * zoomScale)
      .attr('viewBox', null)
      .attr('preserveAspectRatio', null)
  } else {
    // Use viewBox to make everything fit
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', preserveAspectRatio)
  }

  const defs = svg.append('defs')

  // Apply zoom scale to the content group.
  // When scaling, we need to apply scale first, then translate by the scaled offset
  const contentGroup = svg
    .append('g')
    .attr('transform', `scale(${zoomScale ?? 1}) translate(${offsetX}, ${offsetY})`)

  return { defs, contentGroup }
}

/**
 * Creates a gaussian-blur glow filter in the given defs, usable via
 * `attr('filter', 'url(#<filterId>)')`.
 */
export function createGlowFilter(
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  filterId: string
): void {
  const blurAmount = '4'
  const filter = defs.append('filter').attr('id', filterId)

  filter.append('feGaussianBlur').attr('stdDeviation', blurAmount).attr('result', 'coloredBlur')

  const merge = filter.append('feMerge')
  merge.append('feMergeNode').attr('in', 'coloredBlur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')
}
