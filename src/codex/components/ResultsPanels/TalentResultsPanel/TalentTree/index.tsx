import { useEffect, useRef } from 'react'

import { select, Selection } from 'd3-selection'
import { hierarchy, tree } from 'd3-hierarchy'

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
  parseTalentDescriptionLineForDesktopRendering,
  parseTalentDescriptionLineForMobileRendering,
  wrapTextForTalents,
} from '@/codex/utils/talentTreeHelper'
import {
  cacheAllNodeDimensions,
  getNodeHalfWidth,
  getNodeHeight,
  type TalentRenderingContext,
} from '@/codex/utils/talentNodeDimensions'
import {
  REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP,
  REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP,
} from '@/codex/constants/talentsMappingValues'
import {
  NODE,
  REQUIREMENT_NODE,
  TEXT,
  TREE,
  REQUIREMENT_INDICATOR,
  EXPANSION_BUTTON,
  SEPARATOR,
} from '@/codex/constants/talentTreeValues'
import { buildHierarchicalTreeFromTalentTree } from '@/codex/utils/talentTreeBuilder'
import { useExpandableNodes } from '@/codex/hooks/useExpandableNodes'
import { useAllTalentSearchFilters } from '@/codex/hooks/useSearchFilters'

import { drawLinks } from './links'
import styles from './index.module.scss'

const cx = createCx(styles)

interface TalentTreeProps {
  talentTree: TalentTreeType | undefined
  useSearchFilters: ReturnType<typeof useAllTalentSearchFilters>
  useDescriptionExpansion: ReturnType<typeof useExpandableNodes>
  useChildrenExpansion: ReturnType<typeof useExpandableNodes>
}

export default function TalentTree({
  talentTree,
  useSearchFilters,
  useDescriptionExpansion,
  useChildrenExpansion,
}: TalentTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { parsedKeywords, useFormattingFilters } = useSearchFilters
  const { shouldUseMobileFriendlyRendering, shouldShowKeywords, shouldShowBlightbaneLink } =
    useFormattingFilters
  const { toggleNodeExpansion: toggleDescriptionExpansion, isNodeExpanded: isDescriptionExpanded } =
    useDescriptionExpansion
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
      isDescriptionExpanded,
      shouldShowBlightbaneLink,
      parsedKeywords: shouldShowKeywords ? parsedKeywords : [],
    }

    // Pre-cache all node dimensions for performance
    cacheAllNodeDimensions(filteredTree, renderingContext)

    // - - - - - Node dimensions - - - - -
    const nodeWidth = NODE.WIDTH
    const nameHeight = NODE.HEIGHT.NAME
    const minDescriptionHeight = NODE.HEIGHT.MIN_DESCRIPTION
    const collapsedDescriptionHeight = NODE.HEIGHT.COLLAPSED_DESCRIPTION
    const descriptionLineHeight = TEXT.LINE_HEIGHT
    const requirementsHeight = NODE.HEIGHT.REQUIREMENTS
    const keywordsHeight = NODE.HEIGHT.KEYWORDS
    const blightbaneLinkHeight = NODE.HEIGHT.BLIGHTBANE_LINK
    // - - - - - - - - - - - - - - - - - -

    const treeLayout = tree<HierarchicalTalentTreeNode>()
      .nodeSize([NODE.SPACING.VERTICAL_BASE, NODE.SPACING.HORIZONTAL])
      .separation((a, b) => {
        const aHeight = getNodeHeight(a.data, renderingContext)
        const bHeight = getNodeHeight(b.data, renderingContext)

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
        const { count, url, url2, color, label } = getTalentRequirementIconProps(
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
          .attr('class', cx('tree-root-node-circle'))
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
          .attr('class', cx('tree-root-node-label', `tree-root-node-label--depth-${maxDepth}`))
          .style('fill', lighten(color, 5))

        labelParts.forEach((part, index) => {
          textElement
            .append('tspan')
            .attr('x', 0)
            .attr('dy', index === 0 ? 0 : lineHeight)
            .text(part)
        })

        if (count > 0) {
          // Different icon sizes depending on if we are showing a class or energy node.
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
              const clipId = `circle-clip-${_index}-${i}`

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
      } else {
        const isCollapsed = !isDescriptionExpanded(data.name)
        const descLines = wrapTextForTalents(data.description, nodeWidth + 8)
        const additionalRequirements = [
          ...data.otherRequirements,
          ...data.talentRequirements,
        ].filter(isNotNullOrUndefined)

        const descriptionLinesPadding = NODE.PADDING.DESCRIPTION_LINES
        const descriptionHeight = isCollapsed
          ? collapsedDescriptionHeight
          : Math.max(minDescriptionHeight, descLines.length * descriptionLineHeight) +
            descriptionLinesPadding
        const extraRequirementHeight = additionalRequirements.length ? requirementsHeight : 0
        const matchingKeywordsHeight = shouldShowKeywords ? keywordsHeight : 0
        const blightbaneHeight = shouldShowBlightbaneLink ? blightbaneLinkHeight : 0
        const additionalHeight = descriptionHeight + extraRequirementHeight + blightbaneHeight
        const dynamicNodeHeight = nameHeight + additionalHeight + 6

        const nodeGlowWidth = nodeWidth + NODE.GLOW_SIZE
        const nodeGlowHeight = dynamicNodeHeight + NODE.GLOW_SIZE

        nodeElement
          .append('rect')
          .attr('width', nodeGlowWidth)
          .attr('height', nodeGlowHeight)
          .attr('x', -nodeGlowWidth / 2)
          .attr('y', -nodeGlowHeight / 2)
          .attr('class', cx('talent-node-glow', `talent-node-glow--tier-${data.tier || 0}`))
          .attr('filter', 'url(#talent-glow)')

        nodeElement
          .append('rect')
          .attr('width', nodeWidth)
          .attr('height', dynamicNodeHeight)
          .attr('x', -nodeWidth / 2)
          .attr('y', -dynamicNodeHeight / 2)
          .attr('class', cx('talent-node', `talent-node--tier-${data.tier || 0}`))
          .on('click', function (event) {
            event.stopPropagation()
            toggleDescriptionExpansion(data.name)
          })

        if (!isCollapsed) {
          nodeElement
            .append('line')
            .attr('x1', -nodeWidth / 2)
            .attr('y1', -dynamicNodeHeight / 2 + nameHeight)
            .attr('x2', nodeWidth / 2)
            .attr('y2', -dynamicNodeHeight / 2 + nameHeight)
            .attr(
              'class',
              cx('talent-node-separator', `talent-node-separator--tier-${data.tier || 0}`)
            )
        }
        if (shouldShowBlightbaneLink) {
          // Very tiny adjustment of divider line.
          const offset = SEPARATOR.BLIGHTBANE_OFFSET
          nodeElement
            .append('line')
            .attr('x1', -nodeWidth / 2)
            .attr(
              'y1',
              -dynamicNodeHeight / 2 +
                nameHeight +
                descriptionHeight +
                extraRequirementHeight +
                offset
            )
            .attr('x2', nodeWidth / 2)
            .attr(
              'y2',
              -dynamicNodeHeight / 2 +
                nameHeight +
                descriptionHeight +
                extraRequirementHeight +
                offset
            )
            .attr(
              'class',
              cx('talent-node-separator', `talent-node-separator--tier-${data.tier || 0}`)
            )
        }

        const nameGroup = nodeElement
          .append('g')
          .attr('transform', `translate(0, ${-dynamicNodeHeight / 2 + nameHeight / 2})`)

        // For names too long to have larger fonts when collapsed
        const isNameReallyLong = data.name.length > NODE.NAME.REALLY_LONG_THRESHOLD

        nameGroup
          .append('text')
          .attr('x', 0)
          .attr('y', isCollapsed ? NODE.NAME.Y_COLLAPSED : NODE.NAME.Y_EXPANDED)
          .text(data.name)
          .attr(
            'class',
            cx('talent-node-name', {
              'talent-node-name--collapsed': isCollapsed,
              'talent-node-name--collapsed-long-name': isCollapsed && isNameReallyLong,
            })
          )

        // Add "Requires" text for additional requirements
        if (additionalRequirements.length > 0) {
          const reqGroup = nodeElement
            .append('g')
            .attr(
              'transform',
              `translate(0, ${-dynamicNodeHeight / 2 + nameHeight + requirementsHeight / 2})`
            )

          reqGroup
            .append('text')
            .attr('x', 0)
            .attr('y', 8)
            .attr(
              'class',
              cx('talent-node-requirements', { 'talent-node-requirements--collapsed': isCollapsed })
            )
            .text(`Requires: ${additionalRequirements.join(', ')}!`)
        }

        if (!isCollapsed) {
          // Calculate the base Y position for description
          const descBaseY =
            -dynamicNodeHeight / 2 + nameHeight + extraRequirementHeight + descriptionHeight / 2
          const verticalCenteringOffset =
            descriptionLinesPadding / 2 + TEXT.CENTERING_OFFSET.DESCRIPTION

          if (shouldUseMobileFriendlyRendering) {
            // Mobile-friendly rendering: use SVG text with emojis
            descLines.forEach((line, i) => {
              const segments = parseTalentDescriptionLineForMobileRendering(line)
              const yPosition =
                descBaseY +
                i * descriptionLineHeight -
                ((descLines.length - 1) * descriptionLineHeight) / 2 +
                verticalCenteringOffset

              nodeElement
                .append('text')
                .attr('x', 0)
                .attr('y', yPosition)
                .attr('class', cx('talent-node-description'))
                .style('pointer-events', 'none')
                .text(segments)
            })
          } else {
            // Desktop rendering: use foreignObject with HTML and images
            descLines.forEach((line, i) => {
              const segments = parseTalentDescriptionLineForDesktopRendering(line)
              const verticalCenteringOffset = TEXT.CENTERING_OFFSET.DESKTOP
              const yPosition =
                descBaseY +
                i * descriptionLineHeight -
                ((descLines.length - 1) * descriptionLineHeight) / 2 +
                verticalCenteringOffset

              const foreignObject = nodeElement
                .append('foreignObject')
                .attr('x', -nodeWidth / 2)
                .attr('y', yPosition)
                .attr('width', nodeWidth)
                .attr('height', descriptionLineHeight)
                .style('pointer-events', 'none')

              let htmlContent = ''
              segments.forEach((segment) => {
                if (segment.type === 'text') {
                  htmlContent += segment.content
                } else if (segment.type === 'image' && 'icon' in segment) {
                  htmlContent += `<img src="${segment.icon}" alt="" />`
                }
              })

              foreignObject
                .append('xhtml:div')
                .attr('xmlns', 'http://www.w3.org/1999/xhtml')
                .attr('class', cx('talent-node-description'))
                .html(htmlContent)
            })
          }
        }
        if (shouldShowBlightbaneLink) {
          const blightbaneLink = `https://www.blightbane.io/talent/${data.name.replaceAll(' ', '_')}`
          const linkYPosition =
            -dynamicNodeHeight / 2 +
            nameHeight +
            descriptionHeight +
            extraRequirementHeight +
            blightbaneHeight / 2

          if (shouldUseMobileFriendlyRendering) {
            // Mobile-friendly rendering: use SVG text (clicking will be harder but functional)
            nodeElement
              .append('text')
              .attr('x', 0)
              .attr('y', linkYPosition + 7)
              .attr('class', cx('talent-node-blightbane-link'))
              .text('View in Blightbane')
              .on('click', function (event) {
                event.stopPropagation()
                window.open(blightbaneLink, '_blank', 'noopener,noreferrer')
              })
          } else {
            // Desktop rendering: use foreignObject with HTML link
            const linkForeignObject = nodeElement
              .append('foreignObject')
              .attr('x', -nodeWidth / 2)
              .attr('y', linkYPosition - 5)
              .attr('width', nodeWidth)
              .attr('height', blightbaneHeight)

            linkForeignObject
              .append('xhtml:div')
              .attr('xmlns', 'http://www.w3.org/1999/xhtml')
              .attr('class', cx('talent-node-blightbane-link-wrapper'))
              .html(
                `<a href="${blightbaneLink}" target="_blank" rel="noopener noreferrer" class="${cx('talent-node-blightbane-link')}">View in Blightbane</a>`
              )
          }
        }

        if (shouldShowKeywords) {
          const keywordsYPosition =
            -dynamicNodeHeight / 2 +
            nameHeight +
            descriptionHeight +
            extraRequirementHeight +
            blightbaneHeight +
            matchingKeywordsHeight

          nodeElement
            .append('text')
            .attr('x', 0)
            .attr('y', keywordsYPosition + 6)
            .attr('height', keywordsHeight)
            .attr('width', nodeWidth)
            .text(getMatchingKeywordsText(data, parsedKeywords))
            .attr('class', cx('talent-node-keywords'))
        }
      }
    })

    // Add requirement indicators on links for new requirements
    const linksWithNewRequirements = treeData
      .links()
      .filter((link) => link.source.depth > 0)
      .map((link) => {
        const newRequirements = [
          ...link.target.data.classOrEnergyRequirements.filter(
            (requirement) => !link.source.data.classOrEnergyRequirements.includes(requirement)
          ),
          ...link.target.data.talentRequirements.filter(
            (requirement) => link.source.data.name !== requirement
          ),
          ...link.target.data.otherRequirements,
        ]

        return { link, newRequirements }
      })
      .filter(({ newRequirements }) => newRequirements.length > 0)

    linksWithNewRequirements.forEach(({ link, newRequirements }, linkIndex) => {
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
    })

    // Add expansion button on nodes
    nodes.each(function ({ data }, _index) {
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

      const nodeElement = select(this)
      const isExpanded = areChildrenExpanded(data.name)

      const xOffset = isExpanded
        ? EXPANSION_BUTTON.X_OFFSET.EXPANDED
        : EXPANSION_BUTTON.X_OFFSET.COLLAPSED
      const buttonX = nodeWidth / 2 + xOffset
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

      buttonGroup
        .append('circle')
        .attr('r', buttonRadius)
        .attr('class', cx('expansion-button-circle'))

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
    })
  }, [
    talentTree,
    isDescriptionExpanded,
    shouldUseMobileFriendlyRendering,
    toggleDescriptionExpansion,
    shouldShowKeywords,
    shouldShowBlightbaneLink,
    parsedKeywords,
    areChildrenExpanded,
    toggleChildrenExpansion,
  ])

  return (
    <div className={cx('talent-tree-container')}>
      <svg ref={svgRef} className={cx('talent-tree')} />
    </div>
  )
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
