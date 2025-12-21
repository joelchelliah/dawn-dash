import { useEffect, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree, type HierarchyPointLink } from 'd3-hierarchy'
import { min, max } from 'd3-array'

import { createCx } from '@/shared/utils/classnames'
import { lighten } from '@/shared/utils/classColors'
import { isNullOrEmpty } from '@/shared/utils/lists'

import {
  TalentTree as TalentTreeType,
  TalentTreeNodeType,
  HierarchicalTalentTreeNode,
} from '@/codex/types/talents'
import {
  getLinkColor,
  getMatchingKeywordsText,
  getNodeInTree,
  getTalentRequirementIconProps,
  matchesKeywordOrHasMatchingDescendant,
  parseTalentDescriptionLineForDesktopRendering,
  parseTalentDescriptionLineForMobileRendering,
  wrapText,
} from '@/codex/utils/talentHelper'
import { REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP } from '@/codex/constants/talentsMappingValues'
import { buildHierarchicalTreeFromTalentTree } from '@/codex/utils/treeHelper'
import { useExpandableNodes } from '@/codex/hooks/useExpandableNodes'
import { useAllTalentSearchFilters } from '@/codex/hooks/useSearchFilters'

import styles from './index.module.scss'

const cx = createCx(styles)

interface TalentTreeProps {
  talentTree: TalentTreeType | undefined
  useSearchFilters: ReturnType<typeof useAllTalentSearchFilters>
  useDescriptionExpansion: ReturnType<typeof useExpandableNodes>
  useChildrenExpansion: ReturnType<typeof useExpandableNodes>
}

const TalentTree = ({
  talentTree,
  useSearchFilters,
  useDescriptionExpansion,
  useChildrenExpansion,
}: TalentTreeProps) => {
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

    // - - - - - Node dimensions - - - - -
    const requirementNodeRadius = 28
    const nodeWidth = 200
    const nameHeight = 30
    const minDescriptionHeight = 15
    const collapsedDescriptionHeight = 4
    const descriptionLineHeight = 15
    const requirementsHeight = 16 // Height for additional requirements text
    const keywordsHeight = 20 // Height for matching keywords text
    const blightbaneLinkHeight = 26 // Height for the Blightbane link
    const defaultVerticalSpacing = 100
    const horizontalSpacing = nodeWidth * 1.3625
    // - - - - - - - - - - - - - - - - - -

    const getDynamicVerticalSpacing = (node: HierarchicalTalentTreeNode) => {
      if (node.type === TalentTreeNodeType.TALENT) {
        const extraRequirementHeight = node.otherParentNames?.length ? requirementsHeight : 0
        const matchingKeywordsHeight =
          shouldShowKeywords && getMatchingKeywordsText(node, parsedKeywords).length > 0
            ? keywordsHeight
            : 0
        const blightbaneHeight = shouldShowBlightbaneLink ? blightbaneLinkHeight / 2 : 0

        const additionalHeight = extraRequirementHeight + matchingKeywordsHeight + blightbaneHeight

        if (!isDescriptionExpanded(node.name)) {
          return nameHeight * 2.8 + additionalHeight
        }

        const descLines = wrapText(node.description, nodeWidth + 10, 10)
        const descriptionHeight = Math.max(
          minDescriptionHeight,
          descLines.length * descriptionLineHeight
        )

        return (nameHeight + descriptionHeight + additionalHeight) * 1.7
      }
      return defaultVerticalSpacing
    }

    const treeLayout = tree<HierarchicalTalentTreeNode>()
      .nodeSize([defaultVerticalSpacing, horizontalSpacing])
      .separation((a, b) => {
        const aVertical = getDynamicVerticalSpacing(a.data)
        const bVertical = getDynamicVerticalSpacing(b.data)
        const minSeparation = (aVertical + bVertical) / (2 * defaultVerticalSpacing)

        return a.parent === b.parent ? minSeparation : minSeparation * 1.25
      })
    const treeData = treeLayout(treeNode)

    const leftPadding = nodeWidth * 0.25
    const offset = (treeNode.children?.[0]?.y ?? 0) - leftPadding

    treeData.each((node) => {
      node.y = node.y - offset
    })

    const allNodes = treeData.descendants()
    const minX = min(allNodes, (d) => d.x) ?? 0
    const maxX = max(allNodes, (d) => d.x) ?? 0
    const maxDepth = max(allNodes, (d) => d.depth) ?? 0

    const topPadding = 40
    const bottomPadding = 1500
    const minFactorForEverythingToFitInContainer = 0.955
    const svgHeight =
      minFactorForEverythingToFitInContainer * maxX - minX + topPadding + bottomPadding

    // Calculate width based on max depth
    const baseWidth = 1050 // Width for depth 4
    const svgWidth = Math.max(400, (maxDepth / 4) * baseWidth) // Minimum 400px, scale with depth
    const svgVerticalPadding = 40

    const mainSvg = select(svgRef.current)
      .attr('viewBox', `0 -${svgVerticalPadding} ${svgWidth} ${svgHeight}`)
      .attr('width', svgWidth)
      .attr('height', svgHeight)

    const defs = mainSvg.append('defs')
    const svg = mainSvg.append('g').attr('transform', `translate(50, ${-minX + topPadding})`)

    const getNodeHalfWidth = (node: HierarchicalTalentTreeNode) => {
      switch (node.type) {
        case TalentTreeNodeType.TALENT:
          return nodeWidth / 2
        default:
          return requirementNodeRadius
      }
    }

    const generateLinkPath = (d: HierarchyPointLink<HierarchicalTalentTreeNode>) => {
      const isRootNode = d.source.depth <= 1
      const xOffset = 2
      const sourceHalfWidth = getNodeHalfWidth(d.source.data)
      const targetHalfWidth = getNodeHalfWidth(d.target.data)

      const sourceX = isRootNode ? d.source.y + 2 * xOffset : d.source.y + sourceHalfWidth - xOffset
      const sourceY = d.source.x
      const targetX = d.target.y - targetHalfWidth
      const targetY = d.target.x

      // Smooth horizontal curve
      const midX = (sourceX + targetX) / 2
      return `M${sourceX},${sourceY}C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`
    }

    // Links between parent and child nodes
    svg
      .selectAll('.link')
      .data(treeData.links().filter((link) => link.source.depth > 0)) // Skip links from virtual root
      .enter()
      .append('path')
      .attr('class', cx('tree-link'))
      .attr('d', generateLinkPath)
      .style('stroke', (link) => {
        const { name, type } = link.source.data
        return getLinkColor(link, name, type)
      })

    // Add nodes
    const nodes = svg
      .selectAll('.node')
      .data(treeData.descendants().filter(({ depth }) => depth > 0)) // Skip virtual root node
      .enter()
      .append('g')
      .attr('transform', ({ y, x }) => `translate(${y ?? 0},${x ?? 0})`)

    // Add filter for talent node glow effect
    defs
      .append('filter')
      .attr('id', 'talent-glow')
      .append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'coloredBlur')

    defs.select('#talent-glow').append('feMerge').append('feMergeNode').attr('in', 'coloredBlur')

    defs.select('#talent-glow').append('feMerge').append('feMergeNode').attr('in', 'SourceGraphic')

    nodes.each(function ({ data }, _index) {
      if (!data.type) {
        throw new Error(`Node ${data.name} has no type!`)
      }

      const nodeElement = select(this)
      const isRequirementNode = data.type !== TalentTreeNodeType.TALENT

      if (isRequirementNode) {
        const { count, url, url2, color, label } = getTalentRequirementIconProps(
          data.type,
          data.name
        )

        const showBiggerIcons =
          data.type === TalentTreeNodeType.CLASS_REQUIREMENT ||
          data.type === TalentTreeNodeType.OFFER_REQUIREMENT ||
          data.type === TalentTreeNodeType.EVENT_REQUIREMENT ||
          data.type === TalentTreeNodeType.CARD_REQUIREMENT

        let circleRadius = 0
        if (showBiggerIcons) {
          circleRadius = requirementNodeRadius
        } else if (count === 1) {
          circleRadius = requirementNodeRadius / 2
        } else if (count === 2) {
          circleRadius = requirementNodeRadius / 1.75
        } else if (count === 3) {
          circleRadius = requirementNodeRadius - 2
        }

        nodeElement
          .append('circle')
          .attr('r', circleRadius)
          .attr('class', cx('tree-root-node-circle'))
          .style('--color', color)

        // Split label on comma for multi-line rendering
        const labelParts = label.split(',').map((part) => part.trim())
        const lineHeight = 24 // Adjust based on your font size
        const totalHeight = labelParts.length * lineHeight
        const startY = -circleRadius - totalHeight + lineHeight / 2

        const textElement = nodeElement
          .append('text')
          .attr('x', 0)
          .attr('y', startY)
          .attr('text-anchor', 'middle')
          .attr('class', cx('tree-root-node-label', `tree-root-node-label--depth-${maxDepth}`))
          .style('fill', lighten(color, 5))

        // Add each line as a tspan
        labelParts.forEach((part, index) => {
          textElement
            .append('tspan')
            .attr('x', 0)
            .attr('dy', index === 0 ? 0 : lineHeight)
            .text(part)
        })

        if (count > 0) {
          // Different icon sizes depending on if we are showing a class or energy node.
          const iconSize = showBiggerIcons ? 52 : 22
          const spacing = 2
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
        const descLines = wrapText(data.description, nodeWidth + 8, 11)

        const descriptionHeight = isCollapsed
          ? collapsedDescriptionHeight
          : Math.max(minDescriptionHeight, descLines.length * descriptionLineHeight)
        const extraRequirementHeight = data.otherParentNames?.length ? requirementsHeight : 0
        const matchingKeywordsHeight = shouldShowKeywords ? keywordsHeight : 0
        const blightbaneHeight = shouldShowBlightbaneLink ? blightbaneLinkHeight : 0
        const additionalHeight = descriptionHeight + extraRequirementHeight + blightbaneHeight
        const dynamicNodeHeight = nameHeight + additionalHeight + 6

        const nodeGlowWidth = nodeWidth + 6
        const nodeGlowHeight = dynamicNodeHeight + 6

        nodeElement
          .append('rect')
          .attr('width', nodeGlowWidth)
          .attr('height', nodeGlowHeight)
          .attr('x', -nodeGlowWidth / 2)
          .attr('y', -nodeGlowHeight / 2)
          .attr('class', cx('talent-node-glow', `talent-node-glow--tier-${data.tier || 0}`))

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
          const offset = 2
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
        const isNameReallyLong = data.name.length > 24

        nameGroup
          .append('text')
          .attr('x', 0)
          .attr('y', isCollapsed ? 10 : 4)
          .text(data.name)
          .attr(
            'class',
            cx('talent-node-name', {
              'talent-node-name--collapsed': isCollapsed,
              'talent-node-name--collapsed-long-name': isCollapsed && isNameReallyLong,
            })
          )

        // Add "Requires" text for additional requirements
        if (data.otherParentNames?.length) {
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
            .text(`Requires: ${data.otherParentNames.join(', ')}!`)
        }

        if (!isCollapsed) {
          // Calculate the base Y position for description
          const descBaseY =
            -dynamicNodeHeight / 2 + nameHeight + extraRequirementHeight + descriptionHeight / 2

          if (shouldUseMobileFriendlyRendering) {
            // Mobile-friendly rendering: use SVG text with emojis
            descLines.forEach((line, i) => {
              const segments = parseTalentDescriptionLineForMobileRendering(line)
              const verticalCenteringOffset = -2
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
              const verticalCenteringOffset = -15
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
        const newRequirements = link.target.data.classOrEnergyRequirements.filter(
          (requirement) => !link.source.data.classOrEnergyRequirements.includes(requirement)
        )

        return { link, newRequirements }
      })
      .filter(({ newRequirements }) => newRequirements.length > 0)

    linksWithNewRequirements.forEach(({ link, newRequirements }, linkIndex) => {
      const targetHalfWidth = getNodeHalfWidth(link.target.data)

      // Position near the end of the link, just before the target node
      const indicatorX = link.target.y - targetHalfWidth
      const indicatorY = link.target.x

      const isClassRequirement = newRequirements.every((requirement) =>
        Object.keys(REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP).includes(requirement)
      )

      const nodeType = isClassRequirement
        ? TalentTreeNodeType.CLASS_REQUIREMENT
        : TalentTreeNodeType.ENERGY_REQUIREMENT

      const propsPerRequirement = newRequirements.map((requirement) =>
        getTalentRequirementIconProps(nodeType, requirement)
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
      const iconSize = isClassRequirement ? 33 : 22
      let nudgeToTheLeft = 6

      // Tweaking of circle sizes and spacing to fit the different scenarios.
      let circleRx = 13
      let circleRy = 13
      let spacing = 0
      if (isClassRequirement) {
        circleRx = 20
        circleRy = 20
        nudgeToTheLeft = 14
      } else if (count === 2) {
        circleRx = 14
        circleRy = 18
        spacing = 4
      } else if (count === 3) {
        circleRx = 16
        circleRy = 28
        spacing = 2
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
            .style('opacity', 0.9)
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

      const xOffset = isExpanded ? 6 : 24
      const buttonX = nodeWidth / 2 + xOffset
      const buttonY = 0
      const buttonRadius = 14
      const buttonHoverRadius = buttonRadius + 4

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
        .attr('y', -2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('class', cx('expansion-button-text'))
        .text(isExpanded ? '−' : '+')
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

export default TalentTree
