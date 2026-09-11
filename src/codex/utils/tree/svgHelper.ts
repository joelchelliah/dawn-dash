import { select, Selection } from 'd3-selection'

interface TreeSvgConfig {
  width: number
  height: number
  zoomScale: number | undefined
  offsetX: number
  offsetY: number
  preserveAspectRatio: 'xMinYMin meet' | 'xMidYMin meet'
}

export const TREE_CONTENT_GROUP_CLASS = 'tree-content-group'

/**
 * Applies everything about a tree SVG that depends on the zoom level: the
 * element's dimensions and the content group's scale/offset transform.
 *
 * - With zoomScale: explicit scaled pixel dimensions (no viewBox).
 * - Without: a viewBox so the tree scales to fit its container.
 */
export function applyTreeZoom(
  svgElement: SVGSVGElement,
  { width, height, zoomScale, offsetX, offsetY, preserveAspectRatio }: TreeSvgConfig
): void {
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

  svg
    .select(`g.${TREE_CONTENT_GROUP_CLASS}`)
    .attr('transform', `scale(${zoomScale ?? 1}) translate(${offsetX}, ${offsetY})`)
}

/**
 * Sizes a tree SVG and creates the defs + zoomed/offset content group,
 * shared by the talent and event tree renderers.
 *
 * The caller is responsible for clearing the SVG first (the event tree
 * must clear before measuring its container for zoom calculations).
 */
export function setupTreeSvg(
  svgElement: SVGSVGElement,
  config: TreeSvgConfig
): {
  defs: Selection<SVGDefsElement, unknown, null, undefined>
  contentGroup: Selection<SVGGElement, unknown, null, undefined>
} {
  const svg = select(svgElement)

  const defs = svg.append('defs')
  const contentGroup = svg.append('g').attr('class', TREE_CONTENT_GROUP_CLASS)

  applyTreeZoom(svgElement, config)

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
