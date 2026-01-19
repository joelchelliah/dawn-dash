import { select } from 'd3-selection'

import { createCx } from '@/shared/utils/classnames'

import { Event } from '@/codex/types/events'
import { getNodeHeight, getArrowheadAngle } from '@/codex/utils/eventTreeHelper'
import { NODE } from '@/codex/constants/eventTreeValues'

import styles from './index.module.scss'

const cx = createCx(styles)

/**
 * Draws links between nodes with directional arrowheads
 * The arrowheads are tilted based on the horizontal displacement between parent and child
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function drawLinks(
  g: any,
  defs: any,
  root: any,
  event: Event,
  showLoopingIndicator: boolean
) {
  g.selectAll(`.${cx('tree-link')}`)
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', cx('tree-link'))
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

      const sourceNodeHeight = getNodeHeight(d.source.data, event, showLoopingIndicator)
      const targetNodeHeight = getNodeHeight(d.target.data, event, showLoopingIndicator)

      return calculateCurvedPathForStandardLinks(
        sourceX,
        sourceY,
        targetX,
        targetY,
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
export function drawRefChildrenLinks(
  g: any,
  defs: any,
  root: any,
  event: Event,
  showLoopingIndicator: boolean
) {
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

    const sourceNodeHeight = getNodeHeight(d.source.data, event, showLoopingIndicator)
    const targetNodeHeight = getNodeHeight(d.target.data, event, showLoopingIndicator)
    const pathData = calculateCurvedPathForStandardLinks(
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourceNodeHeight,
      targetNodeHeight
    )

    g.append('path')
      .attr('class', cx('tree-link'))
      .attr('marker-end', markerUrl)
      .attr('d', pathData)
  })
}

/**
 * Draws straight, dotted links for repeatFrom relationships from corner to corner.
 * Links go from the top corner of the source node to the bottom corner of the target node,
 * with an arrowhead at the target end.
 */
export function drawRepeatFromLinks(
  g: any,
  defs: any,
  root: any,
  event: Event,
  showLoopingIndicator: boolean
) {
  // Build a map of node id -> node for quick lookup
  const nodeMap = new Map<number, any>()
  root.descendants().forEach((node: any) => {
    if (node.data.id !== undefined) {
      nodeMap.set(node.data.id, node)
    }
  })

  // Find all nodes with repeatFrom and create link data
  const repeatFromLinks: Array<{ source: any; target: any }> = []
  root.descendants().forEach((node: any) => {
    if (node.data.ref) {
      const targetNode = nodeMap.get(node.data.ref)
      if (targetNode) {
        repeatFromLinks.push({
          source: node,
          target: targetNode,
        })
      }
    }
  })

  // Draw the repeatFrom links
  const linkGroup = g
    .selectAll(`.${cx('repeat-from-link-group')}`)
    .data(repeatFromLinks)
    .enter()
    .append('g')
    .attr('class', cx('repeat-from-link-group'))

  linkGroup.each(function (this: SVGGElement, d: any, linkIndex: number) {
    const group = select(this)

    const sourceCenterX = d.source.x || 0
    const sourceCenterY = d.source.y || 0
    const targetCenterX = d.target.x || 0
    const targetCenterY = d.target.y || 0

    // Calculate node heights
    const sourceHeight = getNodeHeight(d.source.data, event, showLoopingIndicator)
    const targetHeight = getNodeHeight(d.target.data, event, showLoopingIndicator)

    // Calculate box boundaries
    const sourceBoxHalfWidth = NODE.MIN_WIDTH / 2
    const sourceBoxHalfHeight = sourceHeight / 2
    const targetBoxHalfWidth = NODE.MIN_WIDTH / 2
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

    // Create a single marker for the target end
    const markerId = `arrowhead-repeat-${linkIndex}`
    const markerRefX = 18
    const markerSize = 6

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
      .attr('class', cx('repeat-from-arrowhead'))

    // Draw the main line with arrowhead at target end
    group
      .append('path')
      .attr('class', cx('repeat-from-link'))
      .attr('d', `M${sourceX},${sourceY} L${targetX},${targetY}`)
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
