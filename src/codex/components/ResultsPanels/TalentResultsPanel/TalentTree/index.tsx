import { useEffect, useRef } from 'react'

import { select, Selection } from 'd3-selection'
import { hierarchy, HierarchyPointLink, tree } from 'd3-hierarchy'

import { createCx } from '@/shared/utils/classnames'
import { lighten } from '@/shared/utils/classColors'
import { isNullOrEmpty } from '@/shared/utils/lists'
import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  TalentTree as TalentTreeType,
  TalentTreeNodeType,
  HierarchicalTalentTreeNode,
} from '@/codex/types/talents'
import {
  calculateTalentTreeBounds,
  getMatchingKeywordsText,
  getNodeInTree,
  getTalentRequirementIconProps,
  matchesKeywordOrHasMatchingDescendant,
} from '@/codex/utils/talentTreeHelper'
import {
  cacheAllNodeDimensions,
  getNodeHalfWidth,
  getNodeHeight,
} from '@/codex/utils/talentNodeDimensions'
import { TalentRenderingContext } from '@/codex/utils/talentNodeDimensionCache'
import {
  REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP,
  REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP,
} from '@/codex/constants/talentsMappingValues'
import {
  NODE,
  REQUIREMENT_NODE,
  TREE,
  REQUIREMENT_INDICATOR,
  EXPANSION_BUTTON,
} from '@/codex/constants/talentTreeValues'
import { buildHierarchicalTreeFromTalentTree } from '@/codex/utils/talentTreeBuilder'
import { useExpandableNodes } from '@/codex/hooks/useExpandableNodes'
import { useAllTalentSearchFilters } from '@/codex/hooks/useSearchFilters'
import { wrapTalentText } from '@/codex/utils/talentTextWidthEstimation'

import { drawLinks, getLinksWithNewRequirements } from './links'
import styles from './index.module.scss'

const cx = createCx(styles)

const DEBUG_RECTANGLES = {
  cardSet: false,
  name: false,
  additionalRequirements: false,
  description: false,
  blightbaneLink: false,
  keywords: false,
}

interface TalentTreeProps {
  talentTree: TalentTreeType | undefined
  useSearchFilters: ReturnType<typeof useAllTalentSearchFilters>
  useChildrenExpansion: ReturnType<typeof useExpandableNodes>
}

type NodeElement = Selection<SVGGElement, unknown, null, undefined>

export default function TalentTree({
  talentTree,
  useSearchFilters,
  useChildrenExpansion,
}: TalentTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { parsedKeywords, useFormattingFilters, useCardSetFilters } = useSearchFilters
  const { isCardSetIndexSelected, getCardSetNameFromIndex } = useCardSetFilters
  const { shouldShowDescription, shouldShowCardSet, shouldShowKeywords, shouldShowBlightbaneLink } =
    useFormattingFilters
  const { toggleNodeExpansion: toggleChildrenExpansion, isNodeExpanded: areChildrenExpanded } =
    useChildrenExpansion

  useEffect(() => {
    if (!svgRef.current || !talentTree) return

    // Clear previous visualization
    select(svgRef.current).selectAll('*').remove()

    const fullTree = buildHierarchicalTreeFromTalentTree(talentTree)

    const filterCollapsedChildren = (
      node: HierarchicalTalentTreeNode
    ): HierarchicalTalentTreeNode => {
      if (isNullOrEmpty(node.children)) return node

      if (node.type === TalentTreeNodeType.TALENT && !areChildrenExpanded(node.name)) {
        // Keep children that match keywords or have matching descendants
        const matchingChildren = node.children
          .filter((child) => matchesKeywordOrHasMatchingDescendant(child, parsedKeywords))
          .map(filterCollapsedChildren)
        return { ...node, children: matchingChildren }
      }

      return {
        ...node,
        children: node.children.map(filterCollapsedChildren),
      }
    }

    const filteredTree = filterCollapsedChildren(fullTree)
    const treeNode = hierarchy<HierarchicalTalentTreeNode>(filteredTree)

    // Create rendering context for dimension calculations
    const renderingContext: TalentRenderingContext = {
      shouldShowDescription,
      shouldShowCardSet: (index?: number) =>
        shouldShowCardSet && index !== undefined && isCardSetIndexSelected(index),
      shouldShowBlightbaneLink,
      parsedKeywords: shouldShowKeywords ? parsedKeywords : [],
    }

    const getCardSetName = (index?: number) =>
      shouldShowCardSet && index !== undefined ? getCardSetNameFromIndex(index) : undefined

    // Pre-cache all node dimensions for performance
    cacheAllNodeDimensions(filteredTree, renderingContext)

    const treeLayout = tree<HierarchicalTalentTreeNode>()
      .nodeSize([NODE.SPACING.VERTICAL_BASE, NODE.SPACING.HORIZONTAL])
      .separation((a, b) => {
        const { height: aHeight } = getNodeHeight(a.data, renderingContext)
        const { height: bHeight } = getNodeHeight(b.data, renderingContext)

        // Half of each node's height + fixed gap between them
        const totalSpacing = aHeight / 2 + NODE.SPACING.VERTICAL_GAP + bHeight / 2
        const multiplier = totalSpacing / NODE.SPACING.VERTICAL_BASE

        // Add extra spacing for different parent branches
        return a.parent === b.parent
          ? multiplier
          : multiplier * NODE.SPACING.VERTICAL_GAP_MULTIPLIER_DIFFERENT_PARENTS
      })
    const treeData = treeLayout(treeNode)

    const bounds = calculateTalentTreeBounds(treeData, renderingContext)

    const allNodes = treeData.descendants()
    const maxDepth = Math.max(...allNodes.map((d) => d.depth))

    const svgWidth = bounds.width + TREE.PADDING.LEFT + TREE.PADDING.RIGHT
    const svgHeight = bounds.height + TREE.PADDING.VERTICAL * 2

    const mainSvg = select(svgRef.current)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('preserveAspectRatio', 'xMinYMid meet')

    const defs = mainSvg.append('defs')
    const svg = mainSvg
      .append('g')
      .attr(
        'transform',
        `translate(${TREE.PADDING.LEFT - bounds.minY}, ${TREE.PADDING.VERTICAL - bounds.minX})`
      )

    drawLinks({ svg, treeData })

    // Add nodes
    const nodes = svg
      .selectAll('.node')
      .data(treeData.descendants().filter(({ depth }) => depth > 0)) // Skip virtual root node
      .enter()
      .append('g')
      .attr('transform', ({ y, x }) => `translate(${y ?? 0},${x ?? 0})`)

    createGlowFilter(defs, 'talent-glow')

    nodes.each(function ({ data }, _index) {
      if (!data.type) {
        throw new Error(`Node ${data.name} has no type!`)
      }

      const nodeElement = select(this)
      const isRequirementNode = data.type !== TalentTreeNodeType.TALENT

      if (isRequirementNode) {
        renderRequirementNode(nodeElement, defs, data, _index, maxDepth)
      } else {
        renderTalentNode(
          nodeElement,
          data,
          renderingContext,
          shouldShowDescription,
          shouldShowCardSet,
          shouldShowKeywords,
          shouldShowBlightbaneLink,
          parsedKeywords,
          getCardSetName
        )
      }
    })

    // Add requirement indicators on links for new requirements
    getLinksWithNewRequirements(treeData).forEach(({ link, newRequirements }, linkIndex) => {
      renderRequirementIndicators(svg, defs, link, newRequirements, linkIndex)
    })

    // Add expansion button on nodes
    nodes.each(function ({ data }, _index) {
      if (data.type !== TalentTreeNodeType.TALENT) return

      const talentNodeInFullTree = getNodeInTree(data.name, TalentTreeNodeType.TALENT, fullTree)
      if (isNullOrEmpty(talentNodeInFullTree?.children)) return

      // Don't show button if any descendant matches keywords
      const anyDescendantMatchesKeywords = talentNodeInFullTree.children.some((child) =>
        matchesKeywordOrHasMatchingDescendant(child, parsedKeywords)
      )
      if (anyDescendantMatchesKeywords) return

      renderExpansionButton(
        select(this),
        data,
        fullTree,
        parsedKeywords,
        areChildrenExpanded,
        toggleChildrenExpansion
      )
    })
  }, [
    talentTree,
    shouldShowDescription,
    shouldShowCardSet,
    shouldShowKeywords,
    shouldShowBlightbaneLink,
    parsedKeywords,
    areChildrenExpanded,
    toggleChildrenExpansion,
    isCardSetIndexSelected,
    getCardSetNameFromIndex,
  ])

  return (
    <div className={cx('talent-tree-container')}>
      <svg ref={svgRef} className={cx('talent-tree')} />
    </div>
  )
}

// - - - - - Helper rendering functions - - - - -

/**
 * Renders a requirement indicator on a link between nodes
 */
function renderRequirementIndicators(
  svg: NodeElement,
  defs: NodeElement,
  link: HierarchyPointLink<HierarchicalTalentTreeNode>,
  newRequirements: string[],
  linkIndex: number
): void {
  const targetHalfWidth = getNodeHalfWidth(link.target.data)

  // Position near the end of the link, just before the target node
  const indicatorX = link.target.y - targetHalfWidth
  const indicatorY = link.target.x

  const isOnlyClassRequirement = newRequirements.every((requirement) =>
    Object.keys(REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP).includes(requirement)
  )
  const isEnergyRequirement = newRequirements.some((requirement) =>
    Object.keys(REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP).includes(requirement)
  )

  const propsPerRequirement = newRequirements.map((requirement) =>
    getTalentRequirementIconProps(isOnlyClassRequirement, requirement)
  )

  const color = propsPerRequirement[0].color
  const count = propsPerRequirement.reduce((acc, curr) => acc + curr.count, 0)
  const url = propsPerRequirement[0].url
  const url2 =
    propsPerRequirement[0].count > 1
      ? propsPerRequirement[0].url2 || propsPerRequirement[0].url
      : propsPerRequirement[1]?.url
  const url3 =
    propsPerRequirement[0].count > 2
      ? propsPerRequirement[0].url3 || propsPerRequirement[0].url
      : propsPerRequirement[1]?.url2 || propsPerRequirement[1]?.url
  const iconSize = isEnergyRequirement
    ? REQUIREMENT_INDICATOR.ICON_SIZE.ENERGY
    : REQUIREMENT_INDICATOR.ICON_SIZE.CLASS

  // Tweaking of circle sizes and spacing to fit the different scenarios.
  let circleRx: number = REQUIREMENT_INDICATOR.CIRCLE.RX
  let circleRy: number = REQUIREMENT_INDICATOR.CIRCLE.RY
  let spacing = 0
  let nudgeToTheLeft: number = REQUIREMENT_INDICATOR.DEFAULT_NUDGE
  if (isEnergyRequirement && count === 1) {
    circleRx = REQUIREMENT_INDICATOR.ENERGY.SINGLE.RX
    circleRy = REQUIREMENT_INDICATOR.ENERGY.SINGLE.RY
    nudgeToTheLeft = REQUIREMENT_INDICATOR.ENERGY.SINGLE.NUDGE
  } else if (isEnergyRequirement && count === 2) {
    circleRx = REQUIREMENT_INDICATOR.ENERGY.DOUBLE.RX
    circleRy = REQUIREMENT_INDICATOR.ENERGY.DOUBLE.RY
    spacing = REQUIREMENT_INDICATOR.ENERGY.DOUBLE.SPACING
    nudgeToTheLeft = REQUIREMENT_INDICATOR.ENERGY.DOUBLE.NUDGE
  } else if (isEnergyRequirement && count === 3) {
    circleRx = REQUIREMENT_INDICATOR.ENERGY.TRIPLE.RX
    circleRy = REQUIREMENT_INDICATOR.ENERGY.TRIPLE.RY
    spacing = REQUIREMENT_INDICATOR.ENERGY.TRIPLE.SPACING
    nudgeToTheLeft = REQUIREMENT_INDICATOR.ENERGY.TRIPLE.NUDGE
  }
  const totalHeight = count * iconSize + (count - 1) * spacing
  const x = indicatorX - iconSize / 2 - nudgeToTheLeft
  const startY = indicatorY - totalHeight / 2

  const indicatorGroup = svg.append('g').attr('class', cx('requirement-indicator'))

  indicatorGroup
    .append('ellipse')
    .attr('rx', circleRx)
    .attr('ry', circleRy)
    .attr('cx', x + iconSize / 2)
    .attr('cy', indicatorY)
    .attr('class', cx('requirement-indicator-circle'))
    .style('--color', color)

  // Render each requirement icon vertically
  for (let i = 0; i < count; i++) {
    const y = startY + i * (iconSize + spacing)

    // Single icon - apply circular clipping
    if (count === 1) {
      const clipId = `requirement-clip-${linkIndex}-${i}`

      defs
        .append('clipPath')
        .attr('id', clipId)
        .append('circle')
        .attr('r', iconSize / 2)
        .attr('cx', x + iconSize / 2)
        .attr('cy', y + iconSize / 2)

      indicatorGroup
        .append('image')
        .attr('href', url)
        .attr('x', x)
        .attr('y', y)
        .attr('width', iconSize)
        .attr('height', iconSize)
        .attr('clip-path', `url(#${clipId})`)

      // Multiple icons - no clipping, stack them vertically
    } else {
      let currentUrl = url
      if (i === 1 && url2) {
        currentUrl = url2
      } else if (i === 2 && url3) {
        currentUrl = url3
      }
      indicatorGroup
        .append('image')
        .attr('href', currentUrl)
        .attr('x', x)
        .attr('y', y)
        .attr('width', iconSize)
        .attr('height', iconSize)
        .style('opacity', REQUIREMENT_INDICATOR.STACKED_ICON_OPACITY)
    }
  }
}

/**
 * Renders the icon(s) for a requirement node
 */
function renderRequirementIcons(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeElement: Selection<SVGGElement, any, any, any>,
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  data: HierarchicalTalentTreeNode,
  nodeIndex: number
): void {
  const { count, url, url2 } = getTalentRequirementIconProps(
    data.type === TalentTreeNodeType.CLASS_REQUIREMENT,
    data.name
  )

  if (count === 0) return

  const showBiggerIcons =
    data.type === TalentTreeNodeType.CLASS_REQUIREMENT ||
    data.type === TalentTreeNodeType.OFFER_REQUIREMENT ||
    data.type === TalentTreeNodeType.EVENT_REQUIREMENT ||
    data.type === TalentTreeNodeType.CARD_REQUIREMENT

  const iconSize = showBiggerIcons
    ? REQUIREMENT_NODE.ICON_SIZE.LARGE
    : REQUIREMENT_NODE.ICON_SIZE.SMALL
  const spacing = REQUIREMENT_NODE.ICON_SPACING
  const totalWidth = count * iconSize + (count - 1) * spacing
  const startX = -totalWidth / 2

  for (let i = 0; i < count; i++) {
    const x = startX + i * (iconSize + spacing)

    // Single icon - apply circular clipping
    if (count === 1) {
      const clipId = `circle-clip-${nodeIndex}-${i}`

      defs
        .append('clipPath')
        .attr('id', clipId)
        .append('circle')
        .attr('r', iconSize / 2)
        .attr('cx', x + iconSize / 2)
        .attr('cy', -iconSize / 2 + iconSize / 2)

      nodeElement
        .append('image')
        .attr('href', url)
        .attr('x', x)
        .attr('y', -iconSize / 2)
        .attr('width', iconSize)
        .attr('height', iconSize)
        .attr('clip-path', `url(#${clipId})`)

      // Multiple icons - no clipping, place them next to each other
    } else {
      // For multi-energy requirements, like DEX&STR
      const currentUrl = i === 1 && url2 ? url2 : url
      nodeElement
        .append('image')
        .attr('href', currentUrl)
        .attr('x', x)
        .attr('y', -iconSize / 2)
        .attr('width', iconSize)
        .attr('height', iconSize)
    }
  }
}

/**
 * Renders a requirement node (class, energy, event, card, or offer)
 */
function renderRequirementNode(
  nodeElement: NodeElement,
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  data: HierarchicalTalentTreeNode,
  nodeIndex: number,
  maxDepth: number
): void {
  const { count, color, label } = getTalentRequirementIconProps(
    data.type === TalentTreeNodeType.CLASS_REQUIREMENT,
    data.name
  )

  const showBiggerIcons =
    data.type === TalentTreeNodeType.CLASS_REQUIREMENT ||
    data.type === TalentTreeNodeType.OFFER_REQUIREMENT ||
    data.type === TalentTreeNodeType.EVENT_REQUIREMENT ||
    data.type === TalentTreeNodeType.CARD_REQUIREMENT

  let circleRadius = 0
  if (showBiggerIcons) {
    circleRadius = REQUIREMENT_NODE.RADIUS_DEFAULT
  } else if (count > 0) {
    circleRadius =
      REQUIREMENT_NODE.RADIUS_BY_REQUIREMENT_COUNT[
        count as keyof typeof REQUIREMENT_NODE.RADIUS_BY_REQUIREMENT_COUNT
      ] ?? 0
  }

  nodeElement
    .append('circle')
    .attr('r', circleRadius)
    .attr('class', cx('requirement-node-circle'))
    .style('--color', color)

  const labelParts = label.split(',').map((part) => part.trim())
  const lineHeight = REQUIREMENT_NODE.LABEL_LINE_HEIGHT
  const totalHeight = labelParts.length * lineHeight + REQUIREMENT_NODE.LABEL_BOTTOM_MARGIN
  const startY = -circleRadius - totalHeight + lineHeight / 2

  const textElement = nodeElement
    .append('text')
    .attr('x', 0)
    .attr('y', startY)
    .attr('text-anchor', 'middle')
    .attr('class', cx('requirement-node-label', `requirement-node-label--depth-${maxDepth}`))
    .style('fill', lighten(color, 5))

  labelParts.forEach((part, index) => {
    textElement
      .append('tspan')
      .attr('x', 0)
      .attr('dy', index === 0 ? 0 : lineHeight)
      .text(part)
  })

  renderRequirementIcons(nodeElement, defs, data, nodeIndex)
}

/**
 * Renders the main talent card node (background, borders, content)
 */
function renderTalentNode(
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
    if (cardSetName) {
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

function renderExpansionButton(
  nodeElement: NodeElement,
  data: HierarchicalTalentTreeNode,
  fullTree: HierarchicalTalentTreeNode,
  parsedKeywords: string[],
  areChildrenExpanded: (name: string) => boolean,
  toggleChildrenExpansion: (name: string) => void
): void {
  if (data.type !== TalentTreeNodeType.TALENT) return

  const talentNodeInFullTree = getNodeInTree(data.name, TalentTreeNodeType.TALENT, fullTree)
  if (isNullOrEmpty(talentNodeInFullTree?.children)) return

  // Don't show button if any descendant matches keywords (button would be useless)
  if (
    talentNodeInFullTree.children.some((child) =>
      matchesKeywordOrHasMatchingDescendant(child, parsedKeywords)
    )
  )
    return

  const isExpanded = areChildrenExpanded(data.name)

  const xOffset = isExpanded
    ? EXPANSION_BUTTON.X_OFFSET.EXPANDED
    : EXPANSION_BUTTON.X_OFFSET.COLLAPSED
  const buttonX = NODE.WIDTH / 2 + xOffset
  const buttonY = 0
  const buttonRadius = EXPANSION_BUTTON.RADIUS
  const buttonHoverRadius = buttonRadius + EXPANSION_BUTTON.HOVER_RADIUS_ADDITION

  const buttonGroup = nodeElement
    .append('g')
    .attr('class', cx('expansion-button'))
    .attr('transform', `translate(${buttonX}, ${buttonY})`)
    .on('click', function (event) {
      event.stopPropagation()
      toggleChildrenExpansion(data.name)
    })

  buttonGroup.append('circle').attr('r', buttonRadius).attr('class', cx('expansion-button-circle'))

  buttonGroup.on('mouseenter', function () {
    select(this).select('circle').attr('r', buttonHoverRadius)
  })
  buttonGroup.on('mouseleave', function () {
    select(this).select('circle').attr('r', buttonRadius)
  })

  buttonGroup
    .append('text')
    .attr('x', 0)
    .attr('y', EXPANSION_BUTTON.TEXT_Y_OFFSET)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('class', cx('expansion-button-text'))
    .text(isExpanded ? EXPANSION_BUTTON.SYMBOL.EXPANDED : EXPANSION_BUTTON.SYMBOL.COLLAPSED)
}

const createGlowFilter = (
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  filterId: string
): void => {
  const blurAmount = '4'
  const filter = defs.append('filter').attr('id', filterId)

  filter.append('feGaussianBlur').attr('stdDeviation', blurAmount).attr('result', 'coloredBlur')

  const merge = filter.append('feMerge')
  merge.append('feMergeNode').attr('in', 'coloredBlur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')
}
