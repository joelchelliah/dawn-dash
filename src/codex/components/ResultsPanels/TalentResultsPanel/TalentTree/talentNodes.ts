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
type SectionGroup = Selection<SVGGElement, unknown, null, undefined>

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
  const { height: nameHeight, margin: nameMargin } = getNameDimensions(shouldShowDescription)
  const totalNameHeight = nameHeight + 2 * nameMargin

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
    if (cardSetName && cardSetName !== '-') {
      renderCardSets(nodeElement, -halfNodeHeight, cardSetName, tier)
    }
  }

  renderTalentName(nodeElement, data, -halfNodeHeight, shouldShowDescription)

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
    const matchingKeywords = getMatchingKeywordsText(data, parsedKeywords)
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
  shouldShowDescription: boolean
): void {
  const { height: nameHeight, margin: nameMargin } = getNameDimensions(shouldShowDescription)
  const halfNameHeight = nameHeight / 2
  const nameGroup = appendSectionGroup(
    nodeElement,
    originY + halfNameHeight + nameMargin,
    halfNameHeight,
    nameMargin,
    nameHeight + 2 * nameMargin,
    'name'
  )

  // For names too long to have larger fonts when collapsed
  const isNameReallyLong = data.name.length > NODE.NAME.REALLY_LONG_THRESHOLD

  nameGroup
    .append('text')
    .attr('y', halfNameHeight)
    .text(data.name)
    .attr(
      'class',
      cx('talent-node-name', {
        'talent-node-name--collapsed': !shouldShowDescription,
        'talent-node-name--collapsed-long-name': !shouldShowDescription && isNameReallyLong,
      })
    )
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

function renderKeywords(nodeElement: NodeElement, originY: number, matchingKeywords: string): void {
  const halfKeywordsHeight = NODE.KEYWORDS.HEIGHT / 2
  const topMargin = NODE.KEYWORDS.TOP_MARGIN
  const bottomMargin = NODE.KEYWORDS.BOTTOM_MARGIN

  const keywordsGroup = appendSectionGroup(
    nodeElement,
    originY + halfKeywordsHeight + topMargin,
    halfKeywordsHeight,
    topMargin,
    NODE.KEYWORDS.HEIGHT + topMargin + bottomMargin,
    'keywords'
  )

  keywordsGroup
    .append('text')
    .attr('y', halfKeywordsHeight)
    .attr('class', cx('talent-node-keywords'))
    .text(matchingKeywords)
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
