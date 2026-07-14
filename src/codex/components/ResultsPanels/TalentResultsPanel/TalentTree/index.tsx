import { memo, useEffect, useMemo, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree } from 'd3-hierarchy'

import { createCx } from '@/shared/utils/classnames'
import { isNullOrEmpty } from '@/shared/utils/lists'

import {
  TalentTree as TalentTreeType,
  TalentTreeNodeType,
  HierarchicalTalentTreeNode,
  TalentRenderingContext,
} from '@/codex/types/talents'
import {
  calculateTalentTreeBounds,
  matchesKeywordOrHasMatchingDescendant,
  getNodeInTree,
} from '@/codex/utils/talentTreeHelper'
import { cacheAllNodeDimensions, getNodeHeight } from '@/codex/utils/talentNodeDimensions'
import { setupTreeSvg, createGlowFilter } from '@/codex/utils/tree/svgHelper'
import { NODE, TREE } from '@/codex/constants/talentTreeValues'
import { buildHierarchicalTreeFromTalentTree } from '@/codex/utils/talentTreeBuilder'
import { ZoomLevel } from '@/codex/constants/zoomValues'

import { drawLinks, getLinksWithNewRequirements } from './links'
import { renderRequirementNode, renderRequirementIndicators } from './requirementNodes'
import { renderTalentNode } from './talentNodes'
import { renderExpansionButton } from './expansionButtons'
import styles from './index.module.scss'

const cx = createCx(styles)

interface TalentTreeProps {
  talentTree: TalentTreeType | undefined
  parsedKeywords: string[]
  shouldShowDescription: boolean
  shouldShowCardSet: boolean
  shouldShowKeywords: boolean
  shouldShowBlightbaneLink: boolean
  isCardSetIndexSelected: (index: number) => boolean
  getCardSetNameFromIndex: (index: number) => string
  areChildrenExpanded: (nodeName: string) => boolean
  toggleChildrenExpansion: (nodeName: string) => void
  zoomLevel: ZoomLevel
}

function TalentTree({
  talentTree,
  parsedKeywords,
  shouldShowDescription,
  shouldShowCardSet,
  shouldShowKeywords,
  shouldShowBlightbaneLink,
  isCardSetIndexSelected,
  getCardSetNameFromIndex,
  areChildrenExpanded,
  toggleChildrenExpansion,
  zoomLevel,
}: TalentTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollWrapperRef = useRef<HTMLDivElement>(null)

  // Layout computation: everything that positions and sizes the tree.
  // Deliberately independent of zoomLevel, so zooming only re-renders (below)
  // without re-running dimension caching or the tree layout.
  const layout = useMemo(() => {
    if (!talentTree) return null

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

    const maxDepth = Math.max(...treeData.descendants().map((d) => d.depth))

    const svgWidth = bounds.width + TREE.PADDING.LEFT + TREE.PADDING.RIGHT
    const svgHeight = bounds.height + TREE.PADDING.VERTICAL * 2
    const offsetX = TREE.PADDING.LEFT - bounds.minY
    const offsetY = TREE.PADDING.VERTICAL - bounds.minX

    return { fullTree, treeData, renderingContext, maxDepth, svgWidth, svgHeight, offsetX, offsetY }
  }, [
    talentTree,
    parsedKeywords,
    shouldShowDescription,
    shouldShowCardSet,
    shouldShowKeywords,
    shouldShowBlightbaneLink,
    isCardSetIndexSelected,
    areChildrenExpanded,
  ])

  // Render effect: draws the precomputed layout at the current zoom level
  useEffect(() => {
    if (!svgRef.current || !layout || !scrollWrapperRef.current) return

    const {
      fullTree,
      treeData,
      renderingContext,
      maxDepth,
      svgWidth,
      svgHeight,
      offsetX,
      offsetY,
    } = layout

    // Clear previous visualization
    select(svgRef.current).selectAll('*').remove()

    const getCardSetName = (index?: number) =>
      shouldShowCardSet && index !== undefined ? getCardSetNameFromIndex(index) : undefined

    // Calculate zoom scale for numbered zoom levels.
    // With a depth multiplier so deeper trees don't zoom in as much.
    const getZoomScale = (): number | undefined => {
      if (zoomLevel === ZoomLevel.COVER) return undefined
      const depthMultiplier = 1 / Math.pow(maxDepth, 0.25)
      return (parseInt(zoomLevel.toString()) / 100) * depthMultiplier
    }

    const zoomScale = getZoomScale()

    const { defs, contentGroup: svg } = setupTreeSvg(svgRef.current, {
      width: svgWidth,
      height: svgHeight,
      zoomScale,
      offsetX,
      offsetY,
      preserveAspectRatio: 'xMinYMin meet',
    })

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
    layout,
    zoomLevel,
    shouldShowDescription,
    shouldShowCardSet,
    shouldShowKeywords,
    shouldShowBlightbaneLink,
    parsedKeywords,
    areChildrenExpanded,
    toggleChildrenExpansion,
    getCardSetNameFromIndex,
  ])

  return (
    <div
      ref={scrollWrapperRef}
      className={cx('talent-tree-scroll-wrapper', {
        'talent-tree-scroll-wrapper--cover-zoom': zoomLevel === ZoomLevel.COVER,
      })}
    >
      <svg
        ref={svgRef}
        className={cx('talent-tree', {
          'talent-tree--zoomed': zoomLevel !== ZoomLevel.COVER,
        })}
      />
    </div>
  )
}

export default memo(TalentTree)
