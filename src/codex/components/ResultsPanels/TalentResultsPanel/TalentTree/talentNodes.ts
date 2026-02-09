import { Selection } from 'd3-selection'

import { createCx } from '@/shared/utils/classnames'
import { isNotNullOrUndefined } from '@/shared/utils/object'

import { HierarchicalTalentTreeNode } from '@/codex/types/talents'
import { getMatchingKeywordsText } from '@/codex/utils/talentTreeHelper'
import { getNodeHeight } from '@/codex/utils/talentNodeDimensions'
import { TalentRenderingContext } from '@/codex/utils/talentNodeDimensionCache'
import { wrapTalentText } from '@/codex/utils/talentTextWidthEstimation'
import { NODE } from '@/codex/constants/talentTreeValues'

import styles from './index.module.scss'

const cx = createCx(styles)

type NodeElement = Selection<SVGGElement, unknown, null, undefined>

// Debug rectangles to visualize component boundaries
const DEBUG_RECTANGLES = {
  cardSet: false,
  name: false,
  additionalRequirements: false,
  description: false,
  blightbaneLink: false,
  keywords: false,
}

/**
 * Renders the main talent card node (background, borders, content)
 */
export function renderTalentNode(
  nodeElement: NodeElement,
  data: HierarchicalTalentTreeNode,
  renderingContext: TalentRenderingContext,
  shouldShowDescription: boolean,
  shouldShowCardSet: boolean,
  shouldShowKeywords: boolean,
  shouldShowBlightbaneLink: boolean,
  parsedKeywords: string[],
  getCardSetName: (index?: number) => string | undefined
): void {
  const tier = data.tier || 0
  const nameHeight = shouldShowDescription
    ? NODE.NAME.HEIGHT + 2 * NODE.NAME.VERTICAL_MARGIN
    : NODE.NAME.HEIGHT_NO_DESCRIPTION + 2 * NODE.NAME.VERTICAL_MARGIN

  const additionalRequirements = [...data.otherRequirements, ...data.talentRequirements].filter(
    isNotNullOrUndefined
  )
  const additionalRequirementHeight = additionalRequirements.length
    ? shouldShowDescription
      ? NODE.ADDITIONAL_REQUIREMENTS.HEIGHT + 2 * NODE.ADDITIONAL_REQUIREMENTS.VERTICAL_MARGIN
      : NODE.ADDITIONAL_REQUIREMENTS.HEIGHT_NO_DESCRIPTION +
        2 * NODE.ADDITIONAL_REQUIREMENTS.VERTICAL_MARGIN_NO_DESCRIPTION
    : 0

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

  // Separator line after name
  if (shouldShowDescription) {
    const separatorY = -halfNodeHeight + nameHeight
    nodeElement
      .append('line')
      .attr('x1', -halfNodeWidth)
      .attr('y1', separatorY)
      .attr('x2', halfNodeWidth)
      .attr('y2', separatorY)
      .attr('class', cx('talent-node-separator', `talent-node-separator--tier-${tier}`))
  }

  // Separator line before Blightbane link
  if (shouldShowBlightbaneLink) {
    const separatorY =
      -halfNodeHeight + nameHeight + descriptionHeight + additionalRequirementHeight
    nodeElement
      .append('line')
      .attr('x1', -halfNodeWidth)
      .attr('y1', separatorY)
      .attr('x2', halfNodeWidth)
      .attr('y2', separatorY)
      .attr('class', cx('talent-node-separator', `talent-node-separator--tier-${tier}`))
  }

  if (shouldShowCardSet) {
    const cardSetName = getCardSetName(data.cardSetIndex)
    if (cardSetName && cardSetName !== '-') {
      renderCardSets(nodeElement, -halfNodeHeight, cardSetName, tier)
    }
  }

  renderTalentName(nodeElement, data, -halfNodeHeight, !shouldShowDescription)

  const posAfterNameSeparator = -halfNodeHeight + nameHeight

  if (additionalRequirements.length > 0) {
    renderTalentAdditionalRequirements(
      nodeElement,
      additionalRequirements,
      posAfterNameSeparator,
      !shouldShowDescription
    )
  }

  const posBeforeDescription = posAfterNameSeparator + additionalRequirementHeight

  if (shouldShowDescription) {
    renderTalentDescription(nodeElement, posBeforeDescription, descriptionLines)
  }

  const posBeforeBlightbaneLink = posBeforeDescription + descriptionHeight

  if (shouldShowBlightbaneLink) {
    renderBlightbaneLink(nodeElement, data, posBeforeBlightbaneLink)
  }

  if (shouldShowKeywords) {
    const matchingKeywords = getMatchingKeywordsText(data, parsedKeywords)
    if (matchingKeywords.length > 0) {
      renderKeywords(nodeElement, halfNodeHeight, matchingKeywords)
    }
  }
}

/**
 * Renders the card set label above the talent node
 */
function renderCardSets(
  nodeElement: NodeElement,
  originY: number,
  cardSetName: string,
  tier: number
): void {
  const halfCardSetHeight = NODE.CARD_SET.HEIGHT / 2
  const topMargin = NODE.CARD_SET.TOP_MARGIN
  const bottomMargin = NODE.CARD_SET.BOTTOM_MARGIN
  const cardSetGroup = nodeElement
    .append('g')
    .attr('transform', `translate(0, ${originY - halfCardSetHeight - bottomMargin})`)

  if (DEBUG_RECTANGLES.cardSet) {
    cardSetGroup
      .append('rect')
      .attr('x', -NODE.WIDTH / 2)
      .attr('y', -halfCardSetHeight - bottomMargin)
      .attr('width', NODE.WIDTH)
      .attr('height', NODE.CARD_SET.HEIGHT + topMargin + bottomMargin)
      .attr('fill', 'rgba(255, 0, 255, 0.2)')
      .attr('stroke', 'rgba(255, 0, 255, 0.5)')
      .attr('stroke-width', 1)
  }

  cardSetGroup
    .append('text')
    .attr('y', halfCardSetHeight)
    .text(cardSetName)
    .attr('class', cx('talent-node-card-sets', `talent-node-card-sets--tier-${tier}`))
}

/**
 * Renders the talent name in the node
 */
function renderTalentName(
  nodeElement: NodeElement,
  data: HierarchicalTalentTreeNode,
  originY: number,
  isDescriptionHidden: boolean
): void {
  const nameHeight = isDescriptionHidden ? NODE.NAME.HEIGHT_NO_DESCRIPTION : NODE.NAME.HEIGHT
  const halfNameHeight = nameHeight / 2
  const halfVerticalMargin = NODE.NAME.VERTICAL_MARGIN
  const nameGroup = nodeElement
    .append('g')
    .attr('transform', `translate(0, ${originY + halfNameHeight + halfVerticalMargin})`)

  if (DEBUG_RECTANGLES.name) {
    nameGroup
      .append('rect')
      .attr('x', -NODE.WIDTH / 2)
      .attr('y', -halfNameHeight - halfVerticalMargin)
      .attr('width', NODE.WIDTH)
      .attr('height', nameHeight + 2 * halfVerticalMargin)
      .attr('fill', 'rgba(255, 0, 0, 0.4)')
      .attr('stroke', 'rgba(255, 0, 0, 1)')
      .attr('stroke-width', 1)
  }

  // For names too long to have larger fonts when collapsed
  const isNameReallyLong = data.name.length > NODE.NAME.REALLY_LONG_THRESHOLD

  nameGroup
    .append('text')
    .attr('y', halfNameHeight)
    .text(data.name)
    .attr(
      'class',
      cx('talent-node-name', {
        'talent-node-name--collapsed': isDescriptionHidden,
        'talent-node-name--collapsed-long-name': isDescriptionHidden && isNameReallyLong,
      })
    )
}

/**
 * Renders additional requirements text (talent and other requirements)
 */
function renderTalentAdditionalRequirements(
  nodeElement: NodeElement,
  additionalRequirements: string[],
  originY: number,
  isDescriptionHidden: boolean
): void {
  const additionalRequirementsHeight = isDescriptionHidden
    ? NODE.ADDITIONAL_REQUIREMENTS.HEIGHT_NO_DESCRIPTION
    : NODE.ADDITIONAL_REQUIREMENTS.HEIGHT
  const halfAdditionalRequirementsHeight = additionalRequirementsHeight / 2
  const halfVerticalMargin = isDescriptionHidden
    ? NODE.ADDITIONAL_REQUIREMENTS.VERTICAL_MARGIN_NO_DESCRIPTION
    : NODE.ADDITIONAL_REQUIREMENTS.VERTICAL_MARGIN

  const requirementsGroup = nodeElement
    .append('g')
    .attr(
      'transform',
      `translate(0, ${originY + halfAdditionalRequirementsHeight + halfVerticalMargin})`
    )

  if (DEBUG_RECTANGLES.additionalRequirements) {
    requirementsGroup
      .append('rect')
      .attr('x', -NODE.WIDTH / 2)
      .attr('y', -halfAdditionalRequirementsHeight - halfVerticalMargin)
      .attr('width', NODE.WIDTH)
      .attr('height', additionalRequirementsHeight + 2 * halfVerticalMargin)
      .attr('fill', 'rgba(0, 255, 0, 0.2)')
      .attr('stroke', 'rgba(0, 255, 0, 0.5)')
      .attr('stroke-width', 1)
  }

  requirementsGroup
    .append('text')
    .attr('y', halfAdditionalRequirementsHeight)
    .attr(
      'class',
      cx('talent-node-requirements', { 'talent-node-requirements--collapsed': isDescriptionHidden })
    )
    .text(`Requires: ${additionalRequirements.join(', ')}!`)
}

/**
 * Renders the talent description text
 */
function renderTalentDescription(
  nodeElement: NodeElement,
  originY: number,
  descriptionLines: string[]
): void {
  const descriptionHeight = descriptionLines.length * NODE.DESCRIPTION.LINE_HEIGHT
  const halfDescriptionHeight = descriptionHeight / 2
  const halfVerticalMargin = NODE.DESCRIPTION.VERTICAL_MARGIN

  const descriptionGroup = nodeElement
    .append('g')
    .attr('transform', `translate(0, ${originY + halfDescriptionHeight + halfVerticalMargin})`)

  if (DEBUG_RECTANGLES.description) {
    descriptionGroup
      .append('rect')
      .attr('x', -NODE.WIDTH / 2)
      .attr('y', -halfDescriptionHeight - halfVerticalMargin)
      .attr('width', NODE.WIDTH)
      .attr('height', descriptionHeight + 2 * halfVerticalMargin)
      .attr('fill', 'rgba(0, 0, 255, 0.2)')
      .attr('stroke', 'rgba(0, 0, 255, 0.5)')
      .attr('stroke-width', 1)
  }

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

/**
 * Renders the clickable Blightbane link
 */
function renderBlightbaneLink(
  nodeElement: NodeElement,
  data: HierarchicalTalentTreeNode,
  originY: number
): void {
  const blightbaneLinkHeight = NODE.BLIGHTBANE_LINK.HEIGHT
  const halfBlightbaneLinkHeight = blightbaneLinkHeight / 2
  const halfVerticalMargin = NODE.BLIGHTBANE_LINK.VERTICAL_MARGIN

  const blightbaneLink = `https://www.blightbane.io/talent/${data.name.replaceAll(' ', '_')}`

  const blightbaneGroup = nodeElement
    .append('g')
    .attr('transform', `translate(0, ${originY + halfBlightbaneLinkHeight + halfVerticalMargin})`)

  if (DEBUG_RECTANGLES.blightbaneLink) {
    blightbaneGroup
      .append('rect')
      .attr('x', -NODE.WIDTH / 2)
      .attr('y', -halfBlightbaneLinkHeight - halfVerticalMargin)
      .attr('width', NODE.WIDTH)
      .attr('height', blightbaneLinkHeight + 2 * halfVerticalMargin)
      .attr('fill', 'rgba(255, 255, 0, 0.2)')
      .attr('stroke', 'rgba(255, 255, 0, 0.5)')
      .attr('stroke-width', 1)
  }

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

/**
 * Renders matching keywords below the talent node
 */
function renderKeywords(nodeElement: NodeElement, originY: number, matchingKeywords: string): void {
  const keywordsHeight = NODE.KEYWORDS.HEIGHT
  const halfKeywordsHeight = keywordsHeight / 2
  const topMargin = NODE.KEYWORDS.TOP_MARGIN
  const bottomMargin = NODE.KEYWORDS.BOTTOM_MARGIN

  const keywordsGroup = nodeElement
    .append('g')
    .attr('transform', `translate(0, ${originY + halfKeywordsHeight + topMargin})`)

  if (DEBUG_RECTANGLES.keywords) {
    keywordsGroup
      .append('rect')
      .attr('x', -NODE.WIDTH / 2)
      .attr('y', -halfKeywordsHeight - topMargin)
      .attr('width', NODE.WIDTH)
      .attr('height', keywordsHeight + topMargin + bottomMargin)
      .attr('fill', 'rgba(0, 255, 255, 0.2)')
      .attr('stroke', 'rgba(0, 255, 255, 0.5)')
      .attr('stroke-width', 1)
  }

  keywordsGroup
    .append('text')
    .attr('y', halfKeywordsHeight)
    .attr('class', cx('talent-node-keywords'))
    .text(matchingKeywords)
}

/**
 * Creates a glow filter for talent nodes
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
