import { select } from 'd3-selection'

import { createCx } from '@/shared/utils/classnames'

import { Event } from '@/codex/types/events'
import {
  getArrowheadAngle,
  getNodeDimensions,
  isCompactEmojiBadgeNode,
  isCompactEmojiOnlyNode,
} from '@/codex/utils/eventTreeHelper'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'

import styles from './links.module.scss'

const cx = createCx(styles)

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DrawLinksParam {
  g: any
  defs: any
  root: any
  event: Event
  showLoopingIndicator: boolean
  levelOfDetail: LevelOfDetail
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Draws links between nodes with directional arrowheads
 * The arrowheads are tilted based on the horizontal displacement between parent and child
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function drawLinks({
  g,
  defs,
  root,
  event,
  showLoopingIndicator,
  levelOfDetail,
}: DrawLinksParam) {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT
  g.selectAll(`.${cx('link')}`)
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', cx('link'))
    .attr('marker-end', (d: any, i: number) => {
      const sourceX = d.source.x || 0
      const targetX = d.target.x || 0
      const markerId = `arrowhead-${i}`

      return arrowheadMarkerForStandardLinks(defs, markerId, sourceX, targetX, 'arrowhead')
    })
    .attr('d', (d: any) => {
      const sourceX = d.source.x || 0
      const sourceY = d.source.y || 0
      const targetX = d.target.x || 0
      const targetY = d.target.y || 0

      const [, sourceNodeHeight] = getNodeDimensions(
        d.source.data,
        event,
        showLoopingIndicator,
        levelOfDetail
      )
      const [, targetNodeHeight] = getNodeDimensions(
        d.target.data,
        event,
        showLoopingIndicator,
        levelOfDetail
      )
      const yOffset = isCompactEmojiBadgeNode(d.target.data, isCompact) ? -24 : -2

      return calculateCurvedPathForStandardLinks(
        sourceX,
        sourceY,
        targetX,
        targetY + yOffset,
        sourceNodeHeight,
        targetNodeHeight
      )
    })
}

/**
 * Draws links for refChildren relationships
 * These links connect a parent node to nodes referenced in its refChildren array
 * The visual style is identical to regular parent-child links
 */
export function drawRefChildrenLinks({
  g,
  defs,
  root,
  event,
  showLoopingIndicator,
  levelOfDetail,
}: DrawLinksParam) {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT

  // Build a map of node id -> node for quick lookup
  const nodeMap = new Map<number, any>()
  root.descendants().forEach((node: any) => {
    if (node.data.id !== undefined) {
      nodeMap.set(node.data.id, node)
    }
  })

  // Find all nodes with refChildren and create link data
  const refChildrenLinks: Array<{ source: any; target: any }> = []
  let linkCounter = 0

  root.descendants().forEach((node: any) => {
    if (node.data.refChildren && Array.isArray(node.data.refChildren)) {
      // For each child ID in refChildren array, create a link
      node.data.refChildren.forEach((childId: number) => {
        const targetNode = nodeMap.get(childId)
        if (targetNode) {
          refChildrenLinks.push({
            source: node,
            target: targetNode,
          })
        }
      })
    }
  })

  // Draw the refChildren links with the same style as regular links
  refChildrenLinks.forEach((d: any) => {
    const sourceX = d.source.x || 0
    const sourceY = d.source.y || 0
    const targetX = d.target.x || 0
    const targetY = d.target.y || 0

    const markerId = `arrowhead-refchildren-${linkCounter++}`
    const markerUrl = arrowheadMarkerForStandardLinks(defs, markerId, sourceX, targetX, 'arrowhead')

    const [, sourceNodeHeight] = getNodeDimensions(
      d.source.data,
      event,
      showLoopingIndicator,
      levelOfDetail
    )
    const [, targetNodeHeight] = getNodeDimensions(
      d.target.data,
      event,
      showLoopingIndicator,
      levelOfDetail
    )

    const yOffset = isCompactEmojiBadgeNode(d.target.data, isCompact) ? -24 : -2
    const pathData = calculateCurvedPathForStandardLinks(
      sourceX,
      sourceY,
      targetX,
      targetY + yOffset,
      sourceNodeHeight,
      targetNodeHeight
    )

    g.append('path').attr('class', cx('link')).attr('marker-end', markerUrl).attr('d', pathData)
  })
}

/**
 * Draws straight, dotted links for loop back relationships from corner to corner.
 * Links go from the top corner of the source node to the bottom corner of the target node,
 * with an arrowhead at the target end.
 */
export function drawLoopBackLinks({
  g,
  defs,
  root,
  event,
  showLoopingIndicator,
  levelOfDetail,
}: DrawLinksParam) {
  const nodeMap = buildNodeMap(root)
  const loopBackLinks = findLoopBackLinks(root, nodeMap)
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT

  // Draw the loop back links
  const linkGroup = g
    .selectAll(`.${cx('loop-back-link-group')}`)
    .data(loopBackLinks)
    .enter()
    .append('g')
    .attr('class', cx('loop-back-link-group'))

  linkGroup.each(function (this: SVGGElement, d: any, linkIndex: number) {
    const group = select(this)

    const { sourceX, sourceY, targetX, targetY } = calculateLoopBackLinkCorners(
      d,
      event,
      showLoopingIndicator,
      levelOfDetail
    )

    const sourceNodeType = d.source.data.type || 'default'
    // Create a single marker for the target end
    const markerId = `arrowhead-loop-back-${linkIndex}`
    const markerRefX = isCompact ? 36 : 40
    const markerSize = 7

    defs
      .append('marker')
      .attr('id', markerId)
      .attr('viewBox', '0 -5 20 10')
      .attr('refX', markerRefX)
      .attr('refY', 0)
      .attr('markerWidth', markerSize)
      .attr('markerHeight', markerSize)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L20,0L0,5')
      .attr('class', cx('loop-back-arrowhead', `loop-back-arrowhead--${sourceNodeType}`))

    const sourceYOffset = isCompactEmojiOnlyNode(d.source.data, isCompact, showLoopingIndicator)
      ? -12
      : 0
    const targetYOffset = isCompactEmojiOnlyNode(d.target.data, isCompact, showLoopingIndicator)
      ? 6
      : 0
    const adjustedSourceY = sourceY + sourceYOffset
    const adjustedTargetY = targetY + targetYOffset
    // Draw the main line with arrowhead at target end
    group
      .append('path')
      .attr('class', cx('loop-back-link', `loop-back-link--${sourceNodeType}`))
      .attr('d', `M${sourceX},${adjustedSourceY} L${targetX},${adjustedTargetY}`)
      .attr('marker-end', `url(#${markerId})`)
  })
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Creates an arrowhead marker for standard links
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function arrowheadMarkerForStandardLinks(
  defs: any,
  markerId: string,
  sourceX: number,
  targetX: number,
  arrowheadClass: string
): string {
  const dx = targetX - sourceX
  const angle = getArrowheadAngle(dx)
  const markerRefX = 7
  const markerSize = 5

  defs
    .append('marker')
    .attr('id', markerId)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', markerRefX)
    .attr('refY', 0)
    .attr('markerWidth', markerSize)
    .attr('markerHeight', markerSize)
    .attr('orient', angle)
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('class', cx(arrowheadClass))

  return `url(#${markerId})`
}

/**
 * Calculates the curved path between two nodes in standard links
 */
function calculateCurvedPathForStandardLinks(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceNodeHeight: number,
  targetNodeHeight: number
): string {
  const sourceNodeMid = sourceNodeHeight / 2
  const targetNodeMid = targetNodeHeight / 2

  const startY = sourceY + sourceNodeMid / 1.125
  const endY = targetY - targetNodeMid - 3 // -3 because of arrowhead offset

  // Control points: For curviness!
  const controlOffsetSource = (endY - startY) * 0.2
  const controlOffsetTarget = (endY - startY) * 0.5

  return `M${sourceX},${startY}
          C${sourceX},${startY + controlOffsetSource}
           ${targetX},${endY - controlOffsetTarget}
           ${targetX},${endY}`
}

/**
 * Builds a map of node id -> node for quick lookup
 */
function buildNodeMap(root: any): Map<number, any> {
  const nodeMap = new Map<number, any>()
  root.descendants().forEach((node: any) => {
    if (node.data.id !== undefined) {
      nodeMap.set(node.data.id, node)
    }
  })
  return nodeMap
}

/**
 * Finds all loop back links (nodes with ref property)
 */
function findLoopBackLinks(
  root: any,
  nodeMap: Map<number, any>
): Array<{ source: any; target: any }> {
  const loopBackLinks: Array<{ source: any; target: any }> = []
  root.descendants().forEach((node: any) => {
    // NOTE: ref can be 0 (root id), so don't use truthy checks here.
    if (node.data.ref != null) {
      const targetNode = nodeMap.get(node.data.ref)
      if (targetNode) {
        loopBackLinks.push({
          source: node,
          target: targetNode,
        })
      }
    }
  })
  return loopBackLinks
}

/**
 * Calculates the corner positions for a loop back link
 */
function calculateLoopBackLinkCorners(
  d: any,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): { sourceX: number; sourceY: number; targetX: number; targetY: number } {
  const sourceCenterX = d.source.x || 0
  const sourceCenterY = d.source.y || 0
  const targetCenterX = d.target.x || 0
  const targetCenterY = d.target.y || 0

  const [sourceWidth, sourceHeight] = getNodeDimensions(
    d.source.data,
    event,
    showLoopingIndicator,
    levelOfDetail
  )
  const [targetWidth, targetHeight] = getNodeDimensions(
    d.target.data,
    event,
    showLoopingIndicator,
    levelOfDetail
  )

  // Calculate box boundaries
  const sourceBoxHalfWidth = sourceWidth / 2
  const sourceBoxHalfHeight = sourceHeight / 2
  const targetBoxHalfWidth = targetWidth / 2
  const targetBoxHalfHeight = targetHeight / 2

  // Calculate box edges
  const sourceRightEdge = sourceCenterX + sourceBoxHalfWidth
  const sourceLeftEdge = sourceCenterX - sourceBoxHalfWidth
  const targetRightEdge = targetCenterX + targetBoxHalfWidth
  const targetLeftEdge = targetCenterX - targetBoxHalfWidth

  // Determine source and target corners based on relative x positions
  let sourceX: number
  let targetX: number

  // Source is always from the top of the box
  const sourceY = sourceCenterY - sourceBoxHalfHeight
  // Target is always at the bottom of the box
  const targetY = targetCenterY + targetBoxHalfHeight

  // Determine which corners to connect based on horizontal positioning
  if (sourceRightEdge > targetLeftEdge) {
    // Source's right edge extends beyond target's left edge
    // Route to target's bottom-right corner
    targetX = targetRightEdge
    // Source comes from whichever side makes sense
    const safetyMargin = 20
    if (sourceCenterX > targetCenterX + safetyMargin) {
      sourceX = sourceLeftEdge // From top-left of source
    } else {
      sourceX = sourceRightEdge // From top-right of source
    }
  } else {
    // Source is completely to the left of target
    // Route to target's bottom-left corner
    targetX = targetLeftEdge
    sourceX = sourceRightEdge // From top-right of source
  }

  return { sourceX, sourceY, targetX, targetY }
}
