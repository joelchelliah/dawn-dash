import { createCx } from '@/shared/utils/classnames'

import { Event, EventTreeNode } from '@/codex/types/events'
import {
  getCustomNodeEmoji,
  hasCustomNodeType,
  isEmojiOnlyNode,
} from '@/codex/utils/eventTreeHelper'
import { getNodeDimensions, type NodeMap } from '@/codex/utils/eventNodeDimensions'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'

import styles from './badges.module.scss'

const cx = createCx(styles)

// Resting offset of the altered badge to the right of the node's center. Acts as a floor:
// a node with a center badge shifts further right to clear it (see minX below).
const ALTERED_BADGE_INSET = 26

// How far the altered badge is lifted above the node's top edge. Below the badge radius
// it overlaps the node; above it, the badge floats clear.
const ALTERED_BADGE_LIFT = 26

// Emoji-only nodes render as just the center badge with no text beneath, so the box is
// small and round — the altered badge needs its own offsets to sit well against it.
// These are absolute (no center-badge clearance applied), so the inset can be any value,
// including 0 for dead-center or negative to sit left of center.
const ALTERED_BADGE_INSET_EMOJI_ONLY = 22
const ALTERED_BADGE_LIFT_EMOJI_ONLY = 50

// Altered badge radii, mirroring .altered-badge-circle in badges.module.scss
const ALTERED_BADGE_RADIUS = 13
const ALTERED_BADGE_RADIUS_COMPACT = 11

// Node-type badge radii, mirroring .node-type-badge-circle in badges.module.scss
const NODE_TYPE_BADGE_RADIUS = 17
const NODE_TYPE_BADGE_RADIUS_LARGE = 21
const NODE_TYPE_BADGE_RADIUS_EXTRA_LARGE = 26

// Gap kept between the center node-type badge and the altered badge when they share a node
const ALTERED_BADGE_GAP = 4

// Node types that get a center badge (i.e. have a drawNodeTypeBadge caller below).
// A node of any other type — a choice node — leaves the center free.
const NODE_TYPES_WITH_CENTER_BADGE = new Set(['dialogue', 'end', 'combat', 'special', 'result'])

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DrawBadgesParam {
  g: any
  root: any
  nodeMap: NodeMap
  event: Event
  showLoopingIndicator: boolean
  levelOfDetail: LevelOfDetail
  showContinuesTags: boolean
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
  showContinuesTags,
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
      levelOfDetail,
      showContinuesTags
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
    showContinuesTags,
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
    showContinuesTags,
    endPositionToNodeMap,
    'loop-back-end-badge',
    'loop-back-badge'
  )
}

/**
 * Which size variant the center node-type badge uses on this node.
 * Shared by drawNodeTypeBadge (which applies it) and drawAlteredBadges (which needs the
 * resulting radius to know how far to shift clear of it), so the two can't drift apart.
 */
function getNodeTypeBadgeSize(
  node: any,
  isCompact: boolean,
  showContinuesTags: boolean,
  showLoopingIndicator: boolean
): { showLargeBadge: boolean; showExtraLargeBadge: boolean; radius: number } {
  const isRootNode = node.depth === 0
  const showLargeBadge = isCompact
  const showExtraLargeBadge = isCompact
    ? isRootNode
    : isEmojiOnlyNode(node.data, isCompact, showContinuesTags, showLoopingIndicator) || isRootNode

  // extra-large wins: it's the last class in the cx() call, so it overrides large
  const radius = showExtraLargeBadge
    ? NODE_TYPE_BADGE_RADIUS_EXTRA_LARGE
    : showLargeBadge
      ? NODE_TYPE_BADGE_RADIUS_LARGE
      : NODE_TYPE_BADGE_RADIUS

  return { showLargeBadge, showExtraLargeBadge, radius }
}

/**
 * Badge (ℹ️) marking nodes whose content was manually altered during parsing.
 *
 * Sits near the node's top edge, right of center. On nodes that also carry a center
 * node-type badge it shifts further right to clear it; choice nodes have no center badge,
 * so the badge stays closer in. Emoji-only nodes (badge, no text beneath) have their own
 * offsets, since the node box there is small and round.
 */
export function drawAlteredBadges({
  g,
  root,
  nodeMap,
  event,
  showLoopingIndicator,
  levelOfDetail,
  showContinuesTags,
}: DrawBadgesParam) {
  const alteredNodes = root.descendants().filter((d: any) => d.data.altered === true)
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT

  alteredNodes.forEach((node: any) => {
    const [, nodeHeight] = getNodeDimensions(
      nodeMap,
      node.data,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )

    // Nodes rendered as just the center badge (no text beneath) get their own offsets;
    // everything else uses the defaults, compact or not.
    const isEmojiOnly = isEmojiOnlyNode(
      node.data,
      isCompact,
      showContinuesTags,
      showLoopingIndicator
    )
    const inset = isEmojiOnly ? ALTERED_BADGE_INSET_EMOJI_ONLY : ALTERED_BADGE_INSET
    const lift = isEmojiOnly ? ALTERED_BADGE_LIFT_EMOJI_ONLY : ALTERED_BADGE_LIFT

    // On a node with a center node-type badge, push right far enough to clear it — but
    // only for the default case, where the badge sits alongside the center badge at the
    // same height. Emoji-only nodes place the badge by their own offsets alone (the lift
    // carries it clear of the center badge vertically), so the inset stays absolute and
    // can move the badge anywhere, including left of center.
    const hasCenterBadge = NODE_TYPES_WITH_CENTER_BADGE.has(node.data.type)
    const centerBadgeRadius = hasCenterBadge
      ? getNodeTypeBadgeSize(node, isCompact, showContinuesTags, showLoopingIndicator).radius
      : 0
    const alteredBadgeRadius = isCompact ? ALTERED_BADGE_RADIUS_COMPACT : ALTERED_BADGE_RADIUS
    const minX = centerBadgeRadius + ALTERED_BADGE_GAP + alteredBadgeRadius

    const x = node.x + (isEmojiOnly ? inset : Math.max(inset, minX))
    const y = node.y - nodeHeight / 2 - lift

    const badge = g
      .append('g')
      .attr('class', cx('altered-badge'))
      .attr('transform', `translate(${x},${y})`)

    badge.append('circle').attr(
      'class',
      cx('altered-badge-circle', {
        ['altered-badge-circle--small']: isCompact,
      })
    )

    badge
      .append('text')
      .attr(
        'class',
        cx('altered-badge-emoji', {
          ['altered-badge-emoji--small']: isCompact,
        })
      )
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .text('🛠️')
  })
}

export function drawDialogueBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'dialogue', emoji: '💬' })
}

export function drawEndBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'end', emoji: '⛳️' })
}

export function drawCombatBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'combat', emoji: '⚔️' })
}

export function drawSpecialBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'special', emoji: '🧸' })
}

export function drawResultBadge(params: DrawBadgesParam) {
  drawNodeTypeBadge({ ...params, nodeType: 'result', emoji: '📯' })
}

function drawLoopBackBadges(
  g: any,
  position: 'start' | 'end',
  isCompact: boolean,
  showLoopingIndicator: boolean,
  showContinuesTags: boolean,
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
        const isCompactEmojiOnly = isEmojiOnlyNode(
          node,
          isCompact,
          showContinuesTags,
          showLoopingIndicator
        )

        const offsetStart = isCompactEmojiOnly ? 18 : 0
        const offsetEnd = isCompactEmojiOnly ? 6 : 0
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
  showContinuesTags,
  nodeType,
  emoji,
}: DrawNodeTypeBadgeParam) {
  const nodes = root.descendants().filter((d: any) => d.data.type === nodeType)
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT

  nodes.forEach((node: any) => {
    const [, nodeHeight] = getNodeDimensions(
      nodeMap,
      node.data,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )

    const isRootNode = node.depth === 0
    const centerX = node.x

    let yOffset = 4
    if (!isCompact && isRootNode) {
      yOffset = 13
    } else if (isCompact && isRootNode) {
      yOffset = 8
    } else if (isCompact) {
      yOffset = 2
    }

    const topY = node.y - nodeHeight / 2 - yOffset

    const badge = g.append('g').attr('transform', `translate(${centerX},${topY})`)

    const specificNodeType = hasCustomNodeType(node.data) ? 'custom' : nodeType
    const specificEmoji = getCustomNodeEmoji(node.data) ?? emoji

    const { showLargeBadge, showExtraLargeBadge } = getNodeTypeBadgeSize(
      node,
      isCompact,
      showContinuesTags,
      showLoopingIndicator
    )

    badge.append('circle').attr(
      'class',
      cx('node-type-badge-circle', `node-type-badge-circle--${specificNodeType}`, {
        ['node-type-badge-circle--large']: showLargeBadge,
        ['node-type-badge-circle--extra-large']: showExtraLargeBadge,
      })
    )

    badge
      .append('text')
      .attr(
        'class',
        cx('node-type-badge-emoji', {
          ['node-type-badge-emoji--large']: showLargeBadge,
          ['node-type-badge-emoji--extra-large']: showExtraLargeBadge,
        })
      )
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .text(specificEmoji)
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
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
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
    levelOfDetail,
    showContinuesTags
  )
  const [targetWidth, targetHeight] = getNodeDimensions(
    nodeMap,
    d.target.data,
    event,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags
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
    const safetyMargin = 40
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
