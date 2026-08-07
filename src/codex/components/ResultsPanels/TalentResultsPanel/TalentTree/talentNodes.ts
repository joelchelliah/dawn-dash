import { Selection } from 'd3-selection'

import { createCx } from '@/shared/utils/classnames'
import { isNotNullOrUndefined } from '@/shared/utils/object'
import { getCardImageSrc, TALENT_ARTWORK_CATEGORY } from '@/shared/hooks/useCardImageSrc'

import { HierarchicalTalentTreeNode, TalentRenderingContext } from '@/codex/types/talents'
import { getMatchingKeywords } from '@/codex/utils/talentTreeHelper'
import { getNameRowHeight, getNodeHeight } from '@/codex/utils/talentNodeDimensions'
import {
  measureTalentTextWidth,
  truncateTalentName,
  wrapTalentText,
  type TalentNameVariant,
} from '@/codex/utils/talentTextMeasurer'
import { NODE } from '@/codex/constants/talentTreeValues'

import styles from './index.module.scss'

const cx = createCx(styles)

type NodeElement = Selection<SVGGElement, unknown, null, undefined>
type SectionGroup = Selection<SVGGElement, unknown, null, undefined>

/** Which of the flush-left artwork's corners must follow the node's rounded corners */
interface ArtworkCorners {
  roundTopLeft: boolean
  roundBottomLeft: boolean
}

// Debug rectangles to visualize component boundaries
const DEBUG_RECTANGLES = {
  cardSet: { enabled: false, color: '255, 0, 255' },
  name: { enabled: false, color: '255, 0, 0' },
  additionalRequirements: { enabled: false, color: '0, 255, 0' },
  description: { enabled: false, color: '0, 0, 255' },
  blightbaneLink: { enabled: false, color: '255, 255, 0' },
  keywords: { enabled: false, color: '0, 255, 255' },
}

/**
 * Renders the main talent card node (background, borders, content)
 */
export function renderTalentNode(
  nodeElement: NodeElement,
  data: HierarchicalTalentTreeNode,
  renderingContext: TalentRenderingContext,
  shouldShowTalentArt: boolean,
  shouldShowDescription: boolean,
  shouldShowCardSet: boolean,
  shouldShowKeywords: boolean,
  shouldShowBlightbaneLink: boolean,
  parsedKeywords: string[],
  getCardSetName: (index?: number) => string | undefined
): void {
  const tier = data.tier || 0
  const totalNameHeight = getNameRowHeight(shouldShowDescription, shouldShowTalentArt)

  const additionalRequirements = [...data.otherRequirements, ...data.talentRequirements].filter(
    isNotNullOrUndefined
  )

  const { height: additionalRequirementHeight, margin: additionalRequirementMargin } =
    getAdditionalRequirementsDimensions(additionalRequirements.length, shouldShowDescription)
  const totalAdditionalRequirementHeight =
    additionalRequirementHeight + 2 * additionalRequirementMargin

  const descriptionLines = wrapTalentText(
    data.description,
    NODE.WIDTH - NODE.DESCRIPTION.HORIZONTAL_MARGIN * 2
  )
  const descriptionHeight = shouldShowDescription
    ? descriptionLines.length * NODE.DESCRIPTION.LINE_HEIGHT + 2 * NODE.DESCRIPTION.VERTICAL_MARGIN
    : 0

  const { contentHeight: nodeHeight } = getNodeHeight(data, renderingContext)
  const halfNodeHeight = nodeHeight / 2
  const halfNodeWidth = NODE.WIDTH / 2

  const nodeGlowWidth = NODE.WIDTH + NODE.GLOW_SIZE
  const nodeGlowHeight = nodeHeight + NODE.GLOW_SIZE

  // Glow rectangle
  nodeElement
    .append('rect')
    .attr('width', nodeGlowWidth)
    .attr('height', nodeGlowHeight)
    .attr('x', -nodeGlowWidth / 2)
    .attr('y', -nodeGlowHeight / 2)
    .attr('class', cx('talent-node-glow', `talent-node-glow--tier-${tier}`))
    .attr('filter', 'url(#talent-glow)')

  // Main node rectangle
  nodeElement
    .append('rect')
    .attr('width', NODE.WIDTH)
    .attr('height', nodeHeight)
    .attr('x', -halfNodeWidth)
    .attr('y', -halfNodeHeight)
    .attr('class', cx('talent-node', `talent-node--tier-${tier}`))

  const yPosAfterName = -halfNodeHeight + totalNameHeight
  const yPosAfterAdditionalRequirements = yPosAfterName + totalAdditionalRequirementHeight
  const yPosAfterDescription = yPosAfterAdditionalRequirements + descriptionHeight

  // Separator line after name
  if (shouldShowDescription) {
    appendSeparator(nodeElement, yPosAfterName, tier)
  }

  // Separator line before Blightbane link
  if (shouldShowBlightbaneLink) {
    appendSeparator(nodeElement, yPosAfterDescription, tier)
  }

  if (shouldShowCardSet) {
    const cardSetName = getCardSetName(data.cardSetIndex)
    if (cardSetName) {
      renderCardSets(nodeElement, -halfNodeHeight, cardSetName, tier)
    }
  }

  const isNameRowAtNodeBottom =
    !shouldShowDescription && !shouldShowBlightbaneLink && additionalRequirements.length === 0

  renderTalentName(nodeElement, data, -halfNodeHeight, shouldShowDescription, shouldShowTalentArt, {
    roundTopLeft: true,
    roundBottomLeft: isNameRowAtNodeBottom,
  })

  if (additionalRequirements.length > 0) {
    renderTalentAdditionalRequirements(
      nodeElement,
      additionalRequirements,
      yPosAfterName,
      shouldShowDescription
    )
  }

  if (shouldShowDescription) {
    renderTalentDescription(nodeElement, yPosAfterAdditionalRequirements, descriptionLines)
  }

  if (shouldShowBlightbaneLink) {
    renderBlightbaneLink(nodeElement, data, yPosAfterDescription)
  }

  if (shouldShowKeywords) {
    const matchingKeywords = getMatchingKeywords(data, parsedKeywords)
    if (matchingKeywords.length > 0) {
      renderKeywords(nodeElement, halfNodeHeight, matchingKeywords)
    }
  }
}

function renderCardSets(
  nodeElement: NodeElement,
  originY: number,
  cardSetName: string,
  tier: number
): void {
  const halfCardSetHeight = NODE.CARD_SET.HEIGHT / 2
  const topMargin = NODE.CARD_SET.TOP_MARGIN
  const bottomMargin = NODE.CARD_SET.BOTTOM_MARGIN
  const cardSetGroup = appendSectionGroup(
    nodeElement,
    originY - halfCardSetHeight - bottomMargin,
    halfCardSetHeight,
    bottomMargin,
    NODE.CARD_SET.HEIGHT + topMargin + bottomMargin,
    'cardSet'
  )

  cardSetGroup
    .append('text')
    .attr('y', halfCardSetHeight)
    .text(cardSetName)
    .attr('class', cx('talent-node-card-sets', `talent-node-card-sets--tier-${tier}`))
}

function renderTalentName(
  nodeElement: NodeElement,
  data: HierarchicalTalentTreeNode,
  originY: number,
  shouldShowDescription: boolean,
  shouldShowTalentArt: boolean,
  artworkCorners: ArtworkCorners
): void {
  const { height: nameHeight } = getNameDimensions(shouldShowDescription)
  const halfNameHeight = nameHeight / 2
  const rowHeight = getNameRowHeight(shouldShowDescription, shouldShowTalentArt)
  // Margin is whatever the row has left over around the text — grows with the artwork's
  // extra height, keeping the name vertically centred in the taller row.
  const rowMargin = (rowHeight - nameHeight) / 2
  const nameGroup = appendSectionGroup(
    nodeElement,
    originY + halfNameHeight + rowMargin,
    halfNameHeight,
    rowMargin,
    rowHeight,
    'name'
  )

  // For names too long to have larger fonts when collapsed
  const isNameReallyLong = data.name.length > NODE.NAME.REALLY_LONG_THRESHOLD

  const nameVariant: TalentNameVariant = shouldShowDescription
    ? 'name'
    : isNameReallyLong
      ? 'nameCollapsedLong'
      : 'nameCollapsed'

  // With artwork, the icon is flush to the node's left edge and the name is centred in the
  // space left over to its right — so the name's centre is not the node's centre.
  let nameCenterX = 0
  let nameText = data.name

  if (shouldShowTalentArt) {
    // Inset by half the border: SVG strokes straddle the edge, so the node's visible border
    // extends outside `-halfNodeWidth` and would otherwise cover the artwork's left column.
    const halfBorder = NODE.BORDER_WIDTH / 2
    const artHeight = rowHeight - NODE.BORDER_WIDTH
    const halfNodeWidth = NODE.WIDTH / 2
    const artLeftEdge = -halfNodeWidth + halfBorder

    const squareRightEdge = artLeftEdge + artHeight
    const availableWidth = halfNodeWidth - NODE.ARTWORK.GAP - squareRightEdge
    nameCenterX = squareRightEdge + availableWidth / 2

    nameText = truncateTalentName(
      data.name,
      availableWidth * NODE.ARTWORK.NAME_MAX_WIDTH_RATIO,
      nameVariant
    )

    renderTalentArtwork(nameGroup, data, artLeftEdge, artHeight, artworkCorners)
  }

  nameGroup
    .append('text')
    .attr('x', nameCenterX)
    .attr('y', halfNameHeight)
    .text(nameText)
    .attr(
      'class',
      cx('talent-node-name', {
        'talent-node-name--collapsed': !shouldShowDescription,
        'talent-node-name--collapsed-long-name': !shouldShowDescription && isNameReallyLong,
      })
    )
}

/**
 * Renders the artwork flush with the node's left edge.
 *
 * The image is drawn at the wider window's size with `slice`, which scales it to cover and
 * centres the overflow, so only the middle horizontal band shows.
 *
 * A gradient mask fades the right edge out, letting wide art recede under a long name rather
 * than colliding with it.
 */
function renderTalentArtwork(
  nameGroup: SectionGroup,
  data: HierarchicalTalentTreeNode,
  x: number,
  height: number,
  corners: ArtworkCorners
): void {
  const y = -height / 2
  const width = height * NODE.ARTWORK.WIDTH_SCALE

  // Talent category: some names carry different art as a card and as a talent.
  const imageSrc = getCardImageSrc(data.name, null, TALENT_ARTWORK_CATEGORY)

  if (!imageSrc) {
    nameGroup
      .append('path')
      .attr('d', roundedLeftEdgePath(x, y, height, height, corners))
      .attr('class', cx('talent-node-artwork-placeholder'))
    return
  }

  const nodeId = toSvgId(data.name)
  const clipId = `talent-artwork-clip-${nodeId}`
  const maskId = `talent-artwork-mask-${nodeId}`

  nameGroup
    .append('clipPath')
    .attr('id', clipId)
    .append('path')
    .attr('d', roundedLeftEdgePath(x, y, width, height, corners))

  const mask = nameGroup.append('mask').attr('id', maskId)
  const gradientId = `talent-artwork-fade-${nodeId}`

  // Gradient runs across the fade band only, so the rest of the artwork stays fully opaque.
  const fadeWidth = Math.min(NODE.ARTWORK.FADE_WIDTH, width)
  const gradient = mask
    .append('linearGradient')
    .attr('id', gradientId)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', x + width - fadeWidth)
    .attr('y1', 0)
    .attr('x2', x + width)
    .attr('y2', 0)
  gradient.append('stop').attr('offset', '0%').attr('stop-color', 'white')
  gradient.append('stop').attr('offset', '100%').attr('stop-color', 'black')

  mask
    .append('rect')
    .attr('x', x)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height)
    .attr('fill', `url(#${gradientId})`)

  nameGroup
    .append('image')
    .attr('href', imageSrc)
    .attr('x', x)
    .attr('y', y)
    .attr('width', width)
    .attr('height', height)
    .attr('preserveAspectRatio', 'xMidYMid slice')
    .attr('clip-path', `url(#${clipId})`)
    .attr('mask', `url(#${maskId})`)
    .attr('class', cx('talent-node-artwork'))
}

/**
 * Path for a rectangle whose left corners are optionally rounded with the node's corner radius,
 * so flush-left artwork follows the node's outline.
 */
function roundedLeftEdgePath(
  x: number,
  y: number,
  width: number,
  height: number,
  { roundTopLeft, roundBottomLeft }: ArtworkCorners
): string {
  // Clamped against both axes so a short or narrow box can't use an oversized radius.
  const r = Math.min(NODE.CORNER_RADIUS, height / 2, width)
  const right = x + width
  const bottom = y + height

  // Traced clockwise from the top-left, so each arc curves in the direction of travel.
  return [
    roundTopLeft ? `M ${x + r} ${y}` : `M ${x} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${bottom}`,
    roundBottomLeft
      ? `L ${x + r} ${bottom} A ${r} ${r} 0 0 1 ${x} ${bottom - r}`
      : `L ${x} ${bottom}`,
    roundTopLeft ? `L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y}` : `L ${x} ${y}`,
    'Z',
  ].join(' ')
}

/** Talent names carry spaces, apostrophes and commas — none of which are safe in an SVG id. */
function toSvgId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '-')
}

function getNameDimensions(shouldShowDescription: boolean): {
  height: number
  margin: number
} {
  const height = shouldShowDescription ? NODE.NAME.HEIGHT : NODE.NAME.HEIGHT_NO_DESCRIPTION
  const margin = NODE.NAME.VERTICAL_MARGIN

  return { height, margin }
}

function renderTalentAdditionalRequirements(
  nodeElement: NodeElement,
  additionalRequirements: string[],
  originY: number,
  shouldShowDescription: boolean
): void {
  const { height: additionalRequirementHeight, margin: additionalRequirementMargin } =
    getAdditionalRequirementsDimensions(additionalRequirements.length, shouldShowDescription)

  const halfAdditionalRequirementsHeight = additionalRequirementHeight / 2

  const requirementsGroup = appendSectionGroup(
    nodeElement,
    originY + halfAdditionalRequirementsHeight + additionalRequirementMargin,
    halfAdditionalRequirementsHeight,
    additionalRequirementMargin,
    additionalRequirementHeight + 2 * additionalRequirementMargin,
    'additionalRequirements'
  )

  requirementsGroup
    .append('text')
    .attr('y', halfAdditionalRequirementsHeight)
    .attr(
      'class',
      cx('talent-node-requirements', {
        'talent-node-requirements--collapsed': !shouldShowDescription,
      })
    )
    .text(`Requires: ${additionalRequirements.join(', ')}!`)
}

function getAdditionalRequirementsDimensions(
  numRequirements: number,
  shouldShowDescription: boolean
): {
  height: number
  margin: number
} {
  if (numRequirements === 0) {
    return { height: 0, margin: 0 }
  }
  const height = shouldShowDescription
    ? NODE.ADDITIONAL_REQUIREMENTS.HEIGHT
    : NODE.ADDITIONAL_REQUIREMENTS.HEIGHT_NO_DESCRIPTION
  const margin = shouldShowDescription
    ? NODE.ADDITIONAL_REQUIREMENTS.VERTICAL_MARGIN
    : NODE.ADDITIONAL_REQUIREMENTS.VERTICAL_MARGIN_NO_DESCRIPTION

  return { height, margin }
}

function renderTalentDescription(
  nodeElement: NodeElement,
  originY: number,
  descriptionLines: string[]
): void {
  const descriptionHeight = descriptionLines.length * NODE.DESCRIPTION.LINE_HEIGHT
  const halfDescriptionHeight = descriptionHeight / 2
  const halfVerticalMargin = NODE.DESCRIPTION.VERTICAL_MARGIN

  const descriptionGroup = appendSectionGroup(
    nodeElement,
    originY + halfDescriptionHeight + halfVerticalMargin,
    halfDescriptionHeight,
    halfVerticalMargin,
    descriptionHeight + 2 * halfVerticalMargin,
    'description'
  )

  // Position text lines within the centered content area
  // Start from top of content area (-halfDescriptionHeight) and offset by line index
  // The 0.75 multiplier accounts for SVG text baseline positioning - text baseline sits
  // approximately 75% down from the top of the line height, creating proper vertical centering
  descriptionLines.forEach((line, i) => {
    const yPosition = -halfDescriptionHeight + (i + 0.75) * NODE.DESCRIPTION.LINE_HEIGHT

    descriptionGroup
      .append('text')
      .attr('y', yPosition)
      .attr('class', cx('talent-node-description'))
      .style('pointer-events', 'none')
      .text(line)
  })
}

function renderBlightbaneLink(
  nodeElement: NodeElement,
  data: HierarchicalTalentTreeNode,
  originY: number
): void {
  const halfBlightbaneLinkHeight = NODE.BLIGHTBANE_LINK.HEIGHT / 2
  const halfVerticalMargin = NODE.BLIGHTBANE_LINK.VERTICAL_MARGIN

  const blightbaneLink = `https://www.blightbane.io/talent/${data.name.replaceAll(' ', '_')}`

  const blightbaneGroup = appendSectionGroup(
    nodeElement,
    originY + halfBlightbaneLinkHeight + halfVerticalMargin,
    halfBlightbaneLinkHeight,
    halfVerticalMargin,
    NODE.BLIGHTBANE_LINK.HEIGHT + 2 * halfVerticalMargin,
    'blightbaneLink'
  )

  blightbaneGroup
    .append('text')
    .attr('y', halfBlightbaneLinkHeight)
    .attr('class', cx('talent-node-blightbane-link'))
    .text('View in Blightbane')
    .on('click', function (event) {
      event.stopPropagation()
      window.open(blightbaneLink, '_blank', 'noopener,noreferrer')
    })
}

function renderKeywords(nodeElement: NodeElement, originY: number, keywords: string[]): void {
  const { HEIGHT, TOP_MARGIN, BOTTOM_MARGIN, PILL_PADDING_X, PILL_GAP, PILL_CORNER_RADIUS } =
    NODE.KEYWORDS
  const halfKeywordsHeight = HEIGHT / 2

  const keywordsGroup = appendSectionGroup(
    nodeElement,
    originY + halfKeywordsHeight + TOP_MARGIN,
    halfKeywordsHeight,
    TOP_MARGIN,
    HEIGHT + TOP_MARGIN + BOTTOM_MARGIN,
    'keywords'
  )

  const pills = keywords.map((keyword) => ({
    keyword,
    width: measureTalentTextWidth(keyword) + PILL_PADDING_X * 2,
  }))

  // Keep only what fits on one line, then centre that set as a group.
  const maxRowWidth = NODE.WIDTH - NODE.KEYWORDS.PILL_GAP * 2
  const visiblePills: typeof pills = []
  let rowWidth = 0
  for (const pill of pills) {
    const widthWithPill = rowWidth === 0 ? pill.width : rowWidth + PILL_GAP + pill.width
    if (widthWithPill > maxRowWidth) break
    visiblePills.push(pill)
    rowWidth = widthWithPill
  }
  if (visiblePills.length === 0) return

  let x = -rowWidth / 2

  visiblePills.forEach(({ keyword, width }) => {
    const pillGroup = keywordsGroup.append('g')

    pillGroup
      .append('rect')
      .attr('x', x)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', HEIGHT)
      .attr('rx', PILL_CORNER_RADIUS)
      .attr('ry', PILL_CORNER_RADIUS)
      .attr('class', cx('talent-node-keyword-pill'))

    pillGroup
      .append('text')
      .attr('x', x + width / 2)
      .attr('y', halfKeywordsHeight + NODE.KEYWORDS.PILL_TEXT_BASELINE_OFFSET)
      .attr('class', cx('talent-node-keyword-pill-text'))
      .text(keyword)

    x += width + PILL_GAP
  })
}

function appendSeparator(nodeElement: NodeElement, y: number, tier: number): void {
  const halfNodeWidth = NODE.WIDTH / 2
  nodeElement
    .append('line')
    .attr('x1', -halfNodeWidth)
    .attr('y1', y)
    .attr('x2', halfNodeWidth)
    .attr('y2', y)
    .attr('class', cx('talent-node-separator', `talent-node-separator--tier-${tier}`))
}

/**
 * Appends a positioned group for a node section, with an optional debug rectangle.
 */
function appendSectionGroup(
  nodeElement: NodeElement,
  translateY: number,
  halfHeight: number,
  halfVerticalMargin: number,
  totalHeightIncludingMargins: number,
  debugKey: keyof typeof DEBUG_RECTANGLES
): SectionGroup {
  const group = nodeElement.append('g').attr('transform', `translate(0, ${translateY})`)
  const debug = DEBUG_RECTANGLES[debugKey]

  if (debug?.enabled) {
    const color = debug.color
    group
      .append('rect')
      .attr('x', -NODE.WIDTH / 2)
      .attr('y', -halfHeight - halfVerticalMargin)
      .attr('width', NODE.WIDTH)
      .attr('height', totalHeightIncludingMargins)
      .attr('fill', `rgba(${color}, 0.2)`)
      .attr('stroke', `rgba(${color}, 0.5)`)
      .attr('stroke-width', 1)
  }

  return group
}
