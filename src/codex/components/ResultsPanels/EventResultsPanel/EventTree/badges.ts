import { createCx } from '@/shared/utils/classnames'

import { Event, EventTreeNode } from '@/codex/types/events'
import {
  getNodeDimensions,
  isCompactEmojiOnlyNode,
  type NodeMap,
} from '@/codex/utils/eventTreeHelper'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'

import styles from './badges.module.scss'

const cx = createCx(styles)

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DrawBadgesParam {
  g: any
  root: any
  nodeMap: NodeMap
  event: Event
  showLoopingIndicator: boolean
  levelOfDetail: LevelOfDetail
}

interface DrawNodeTypeBadgeParam extends DrawBadgesParam {
  nodeType: string
  emoji: string
}

export function drawLoopBackLinkBadges({
  g,
  root,
  nodeMap,
  event,
  showLoopingIndicator,
  levelOfDetail,
}: DrawBadgesParam) {
  const loopBackLinks = findLoopBackLinks(root)

  // Track unique positions with nodes to avoid duplicates
  const startPositionToNodeMap = new Map<string, EventTreeNode>()
  const endPositionToNodeMap = new Map<string, EventTreeNode>()

  // Calculate positions for each link
  loopBackLinks.forEach((d) => {
    const { sourceX, sourceY, targetX, targetY } = calculateLoopBackLinkCorners(
      nodeMap,
      d,
      event,
      showLoopingIndicator,
      levelOfDetail
    )

    const startKey = `${sourceX},${sourceY}`
    const endKey = `${targetX},${targetY}`

    // Only add if we haven't seen this position before
    if (!startPositionToNodeMap.has(startKey)) {
      startPositionToNodeMap.set(startKey, d.source.data)
    }
    if (!endPositionToNodeMap.has(endKey)) {
      endPositionToNodeMap.set(endKey, d.target.data)
    }
  })
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT

  // Draw start badges (🔄)
  drawLoopBackBadges(
    g,
    'start',
    isCompact,
    showLoopingIndicator,
    startPositionToNodeMap,
    'loop-back-start-badge',
    'loop-back-badge'
  )

  // Draw end badges (🔗)
  drawLoopBackBadges(
    g,
    'end',
    isCompact,
    showLoopingIndicator,
    endPositionToNodeMap,
    'loop-back-end-badge',
    'loop-back-badge'
  )
}

export function drawDialogueBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'dialogue', emoji: '💬' })
}

export function drawEndBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'end', emoji: '🏁' })
}

export function drawCombatBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'combat', emoji: '⚔️' })
}

export function drawSpecialBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'special', emoji: '🎁' })
}

export function drawResultBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'result', emoji: '🔑' })
}

function drawLoopBackBadges(
  g: any,
  position: 'start' | 'end',
  isCompact: boolean,
  showLoopingIndicator: boolean,
  positionToNodeMap: Map<string, EventTreeNode>,
  badgeClass: string,
  circleBaseClass: string
) {
  const emoji = position === 'start' ? '🔄' : '🔗'
  const badges = g
    .selectAll(`.${cx(badgeClass)}`)
    .data(
      Array.from(positionToNodeMap.entries()).map(([pos, node]) => {
        const [x, y] = pos.split(',').map(Number)
        const isCompactEmojiOnly = isCompactEmojiOnlyNode(node, isCompact, showLoopingIndicator)

        const offsetStart = isCompactEmojiOnly ? 20 : 0
        const offsetEnd = isCompactEmojiOnly ? -6 : 0
        const yOffset = position === 'start' ? offsetStart : offsetEnd

        return {
          x,
          y: y - yOffset,
          nodeType: node.type,
        }
      })
    )
    .enter()
    .append('g')
    .attr('class', cx(badgeClass))
    .attr('transform', (d: any) => `translate(${d.x},${d.y})`)

  badges.append('circle').attr('class', (d: any) =>
    cx(`${circleBaseClass}-circle`, `${circleBaseClass}-circle--${d.nodeType}`, {
      [`${circleBaseClass}-circle--small`]: isCompact,
    })
  )

  badges
    .append('text')
    .attr(
      'class',
      cx(`${circleBaseClass}-emoji`, {
        [`${circleBaseClass}-emoji--small`]: isCompact,
      })
    )

    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(emoji)
}

function drawNodeTypeBadge({
  g,
  root,
  nodeMap,
  event,
  showLoopingIndicator,
  levelOfDetail,
  nodeType,
  emoji,
}: DrawNodeTypeBadgeParam) {
  const nodes = root.descendants().filter((d: any) => d.data.type === nodeType)

  nodes.forEach((node: any) => {
    const [, nodeHeight] = getNodeDimensions(
      nodeMap,
      node.data,
      event,
      showLoopingIndicator,
      levelOfDetail
    )

    const centerX = node.x
    const yOffset = 2
    const topY = node.y - nodeHeight / 2 - yOffset

    const badge = g.append('g').attr('transform', `translate(${centerX},${topY})`)

    badge
      .append('circle')
      .attr('class', cx('node-type-badge-circle', `node-type-badge-circle--${nodeType}`))

    badge
      .append('text')
      .attr('class', cx('node-type-badge-emoji'))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .text(emoji)
  })
}

/**
 * Finds all loop back links (nodes with ref property)
 * nodeMap contains EventTreeNode data, but we need hierarchy nodes with x/y positions
 */
function findLoopBackLinks(root: any): Array<{ source: any; target: any }> {
  // Build hierarchy node map for finding positioned nodes
  const hierarchyNodeMap = new Map<number, any>()
  root.descendants().forEach((node: any) => {
    if (node.data.id !== undefined) {
      hierarchyNodeMap.set(node.data.id, node)
    }
  })

  const loopBackLinks: Array<{ source: any; target: any }> = []
  root.descendants().forEach((node: any) => {
    if (node.data.ref !== undefined) {
      const targetNode = hierarchyNodeMap.get(node.data.ref)
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
  nodeMap: NodeMap,
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
    nodeMap,
    d.source.data,
    event,
    showLoopingIndicator,
    levelOfDetail
  )
  const [targetWidth, targetHeight] = getNodeDimensions(
    nodeMap,
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
