import { useEffect, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree, type HierarchyPointLink } from 'd3-hierarchy'
import { min, max } from 'd3-array'

import { createCx } from '@/shared/utils/classnames'
import { lighten } from '@/shared/utils/classColors'

import {
  TalentTree as TalentTreeType,
  TalentTreeNodeType,
  HierarchicalTalentTreeNode,
} from '@/codex/types/talents'
import {
  getLinkColor,
  getTalentRequirementIconProps,
  parseTalentDescriptionLine,
  wrapText,
} from '@/codex/utils/talentHelper'
import { buildHierarchicalTreeFromTalentTree } from '@/codex/utils/treeHelper'
import { useExpandableNodes } from '@/codex/hooks/useExpandableNodes'
import { useFormattingTalentFilters } from '@/codex/hooks/useSearchFilters/useFormattingTalentFilters'

import styles from './index.module.scss'

const cx = createCx(styles)

interface TalentTreeProps {
  talentTree: TalentTreeType | undefined
  useFormattingFilters: ReturnType<typeof useFormattingTalentFilters>
}

const TalentTree = ({ talentTree, useFormattingFilters }: TalentTreeProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { shouldShowDescription } = useFormattingFilters
  const { toggleNodeVisibility, isNodeVisible } = useExpandableNodes(shouldShowDescription)

  useEffect(() => {
    if (!svgRef.current || !talentTree) return

    // Clear previous visualization
    select(svgRef.current).selectAll('*').remove()

    const treeNode = hierarchy<HierarchicalTalentTreeNode>(
      buildHierarchicalTreeFromTalentTree(talentTree)
    )

    // - - - - - Node dimensions - - - - -
    const requirementNodeRadius = 28
    const nodeWidth = 200
    const nameHeight = 30
    const minDescriptionHeight = 15
    const collapsedDescriptionHeight = 4
    const descriptionLineHeight = 15
    const requirementsHeight = 16 // Height for the Goldstrike requirements section
    const defaultVerticalSpacing = 100
    const horizontalSpacing = nodeWidth * 1.4
    // - - - - - - - - - - - - - - - - - -

    const getDynamicVerticalSpacing = (node: HierarchicalTalentTreeNode) => {
      if (node.type === TalentTreeNodeType.TALENT) {
        if (!isNodeVisible(node.name)) {
          return nameHeight * 2.8
        }

        const descLines = wrapText(node.description, nodeWidth + 10, 10)
        const descriptionHeight = Math.max(
          minDescriptionHeight,
          descLines.length * descriptionLineHeight
        )

        const extraHeight = node.otherParentNames?.length ? requirementsHeight : 0

        return (nameHeight + descriptionHeight + extraHeight) * 1.7
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

    // Shift all nodes left so that the root talents are at y=0
    // (same as the virtual root node, which we are not rendering)
    // NB: Y is horizontal, X is vertical!
    // TODO: This needs some work to make it look good!
    const leftPadding = nodeWidth * 0.25
    const offset =
      treeNode.children && treeNode.children.length > 0
        ? (treeNode.children[0].y ?? 0) - leftPadding
        : -leftPadding
    treeData.each((node) => {
      node.y = node.y - offset
    })

    const allNodes = treeData.descendants()
    const minX = min(allNodes, (d) => d.x) ?? 0
    const maxX = max(allNodes, (d) => d.x) ?? 0
    const maxDepth = max(allNodes, (d) => d.depth) ?? 0

    const topPadding = 40
    const bottomPadding = 1500
    const minFactorForEverythingToFitInContainer = 0.9375
    const svgHeight =
      minFactorForEverythingToFitInContainer * maxX - minX + topPadding + bottomPadding

    // Calculate width based on max depth
    const baseWidth = 1050 // Width for depth 4
    const svgWidth = Math.max(400, (maxDepth / 4) * baseWidth) // Minimum 400px, scale with depth

    const mainSvg = select(svgRef.current)
      .attr('viewBox', `0 -10 ${svgWidth} ${svgHeight}`)
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
      const xOffset = 10
      const sourceHalfWidth = getNodeHalfWidth(d.source.data)
      const targetHalfWidth = getNodeHalfWidth(d.target.data)

      const sourceX = isRootNode ? d.source.y + xOffset : d.source.y + sourceHalfWidth - xOffset
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
        const isClassRequirement = data.type === TalentTreeNodeType.CLASS_REQUIREMENT
        const { count, url, color, label } = getTalentRequirementIconProps(
          isClassRequirement,
          data.name
        )
        const showBiggerIcons =
          isClassRequirement ||
          data.type === TalentTreeNodeType.OFFER_REQUIREMENT ||
          data.type === TalentTreeNodeType.EVENT_REQUIREMENT

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

        nodeElement
          .append('text')
          .attr('x', 0)
          .attr('y', -circleRadius - 8)
          .attr('text-anchor', 'middle')
          .attr('class', cx('tree-root-node-label', `tree-root-node-label--depth-${maxDepth}`))
          .style('fill', lighten(color, 5))
          .text(label)

        if (count > 0) {
          const iconSize = showBiggerIcons ? 52 : 22
          const spacing = 2
          const totalWidth = count * iconSize + (count - 1) * spacing
          const startX = -totalWidth / 2

          for (let i = 0; i < count; i++) {
            const x = startX + i * (iconSize + spacing)

            if (count === 1) {
              // Single icon - apply circular clipping
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
            } else {
              // Multiple icons - no clipping, place them next to each other
              nodeElement
                .append('image')
                .attr('href', url)
                .attr('x', x)
                .attr('y', -iconSize / 2)
                .attr('width', iconSize)
                .attr('height', iconSize)
            }
          }
        }
      } else {
        const isCollapsed = !isNodeVisible(data.name)
        const descLines = wrapText(data.description, nodeWidth + 8, 11)
        const descriptionHeight = isCollapsed
          ? collapsedDescriptionHeight
          : Math.max(minDescriptionHeight, descLines.length * descriptionLineHeight)
        const extraHeight = data.otherParentNames?.length ? requirementsHeight : 0
        const dynamicNodeHeight = nameHeight + descriptionHeight + extraHeight + 6

        nodeElement
          .append('rect')
          .attr('width', nodeWidth + 6)
          .attr('height', dynamicNodeHeight + 6)
          .attr('x', -(nodeWidth + 6) / 2)
          .attr('y', -(dynamicNodeHeight + 6) / 2)
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
            toggleNodeVisibility(data.name)
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

        // Add content group
        const contentGroup = nodeElement.append('g').attr('class', cx('tree-node-content'))

        const nameGroup = contentGroup
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

        // Add requirements section for Goldstrike
        if (data.otherParentNames?.length) {
          const reqGroup = contentGroup
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
            .text(`⚠ Also requires: ${data.otherParentNames.join(', ')}`)
        }

        if (!isCollapsed) {
          const descGroup = contentGroup
            .append('g')
            .attr(
              'transform',
              `translate(0, ${-dynamicNodeHeight / 2 + nameHeight + extraHeight + descriptionHeight / 2})`
            )

          descLines.forEach((line, i) => {
            const segments = parseTalentDescriptionLine(line)
            const verticalCenteringOffset = -15
            const foreignObject = descGroup
              .append('foreignObject')
              .attr('x', -nodeWidth / 2)
              .attr(
                'y',
                i * descriptionLineHeight -
                  ((descLines.length - 1) * descriptionLineHeight) / 2 +
                  verticalCenteringOffset
              )
              .attr('width', nodeWidth)
              .attr('height', descriptionLineHeight)

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
    })
  }, [talentTree, isNodeVisible, toggleNodeVisibility])

  return (
    <div className={cx('talent-tree-container')}>
      <svg ref={svgRef} className={cx('talent-tree')} />
    </div>
  )
}

export default TalentTree
