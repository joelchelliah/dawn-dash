import { useEffect, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree, HierarchyPointNode } from 'd3-hierarchy'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'
import { useDraggable } from '@/shared/hooks/useDraggable'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { Event, EventTreeNode } from '@/codex/types/events'
import {
  calculateTreeBounds,
  buildNodeMap,
  isEmojiOnlyNode,
  hasCustomNodeType,
} from '@/codex/utils/eventTreeHelper'
import { getNodeDimensions, cacheAllNodeDimensions } from '@/codex/utils/eventNodeDimensions'
import {
  adjustHorizontalNodeSpacing,
  adjustVerticalNodeSpacing,
  centerRootNodeHorizontally,
} from '@/codex/utils/eventTreeSpacing'
import { clearEventCache } from '@/codex/utils/eventNodeDimensionCache'
import { NODE, TREE, NODE_BOX } from '@/codex/constants/eventTreeValues'
import { ZoomLevel } from '@/codex/constants/zoomValues'
import {
  LoopingPathMode,
  TreeNavigationMode,
  LevelOfDetail,
} from '@/codex/constants/eventSearchValues'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { UseAllEventSearchFilters } from '@/codex/hooks/useSearchFilters/useAllEventSearchFilters'

import { drawLinks, drawRefChildrenLinks, drawLoopBackLinks } from './links'
import {
  drawLoopBackLinkBadges,
  drawDialogueBadge,
  drawEndBadge,
  drawCombatBadge,
  drawResultBadge,
  drawSpecialBadge,
} from './badges'
import { useEventTreeZoom } from './useEventTreeZoom'
import { createGlowFilter, renderNodeContent } from './nodes'
import styles from './index.module.scss'

const cx = createCx(styles)

interface EventTreeProps {
  event: Event
  useSearchFilters: UseAllEventSearchFilters
  onAllEventsClick: () => void
}

function EventTree({ event, useSearchFilters, onAllEventsClick }: EventTreeProps): JSX.Element {
  const { zoomLevel, levelOfDetail, loopingPathMode, navigationMode, showContinuesTags } =
    useSearchFilters
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollWrapperRef = useRef<HTMLDivElement>(null)

  const { eventImageSrc, onImageSrcError } = useEventImageSrc(event.artwork)
  const zoomCalculator = useEventTreeZoom()
  const { isMobile } = useBreakpoint()
  const { isDragging, handlers } = useDraggable(scrollWrapperRef)

  // Force scroll mode on mobile (touch scrolling works like dragging on mobile)
  const isDragMode = !isMobile && navigationMode === TreeNavigationMode.DRAG

  useEffect(() => {
    if (!svgRef.current || !event.rootNode || !scrollWrapperRef.current) return

    const showLoopingIndicator = loopingPathMode === LoopingPathMode.INDICATOR
    const isCompact = levelOfDetail === LevelOfDetail.COMPACT

    // Clear previous visualization
    select(svgRef.current).selectAll('*').remove()

    const root = hierarchy(event.rootNode, (d) => d.children)
    const nodeMap = buildNodeMap(root as HierarchyPointNode<EventTreeNode>)

    cacheAllNodeDimensions(nodeMap, event, showLoopingIndicator, levelOfDetail, showContinuesTags)

    const getDimensions = (node: EventTreeNode) =>
      getNodeDimensions(
        nodeMap,
        node,
        event,
        showLoopingIndicator,
        levelOfDetail,
        showContinuesTags
      )

    const treeLayout = tree<EventTreeNode>()
      .nodeSize([NODE.HORIZONTAL_SPACING_DEFAULT, NODE.VERTICAL_SPACING_DEFAULT])
      .separation(() => 1)

    treeLayout(root)

    adjustHorizontalNodeSpacing(
      nodeMap,
      root as HierarchyPointNode<EventTreeNode>,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )
    adjustVerticalNodeSpacing(
      nodeMap,
      root as HierarchyPointNode<EventTreeNode>,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )

    const bounds = calculateTreeBounds(
      nodeMap,
      root,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )
    const calculatedWidth = bounds.width + TREE.HORIZONTAL_PADDING * 2
    const verticalPadding = TREE.VERTICAL_PADDING_BY_LEVEL_OF_DETAIL[levelOfDetail]

    const svgWidth = Math.max(calculatedWidth, TREE.MIN_SVG_WIDTH)
    const svgHeight = bounds.height + verticalPadding * 2

    const zoomScale = zoomCalculator.calculate({
      eventName: event.name,
      zoomLevel,
      svgWidth,
      svgHeight,
      containerWidth: scrollWrapperRef.current.clientWidth,
      containerHeight: scrollWrapperRef.current.clientHeight,
    })

    const offsetX = -bounds.minX + TREE.HORIZONTAL_PADDING

    centerRootNodeHorizontally(root as HierarchyPointNode<EventTreeNode>, svgWidth, offsetX)

    // Center the tree vertically
    const offsetY = -bounds.minY + verticalPadding

    const svg = select(svgRef.current)

    if (zoomScale) {
      // When zoomed: remove viewBox, set explicit scaled dimensions
      svg
        .attr('width', svgWidth * zoomScale)
        .attr('height', svgHeight * zoomScale)
        .attr('viewBox', null)
        .attr('preserveAspectRatio', null)
    } else {
      // Use viewBox to make everything fit
      svg
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
        .attr('preserveAspectRatio', 'xMidYMin meet')
    }

    // Define arrow marker - we'll create individual markers for each link
    const defs = svg.append('defs')

    createGlowFilter(defs, 'event-glow')

    // Apply zoom scale to the content group
    // When scaling, we need to apply scale first, then translate by the scaled offset
    const zoomTransformScale = zoomScale ?? 1
    const g = svg
      .append('g')
      .attr('transform', `scale(${zoomTransformScale}) translate(${offsetX}, ${offsetY})`)

    const drawLinksParam = {
      g,
      defs,
      root,
      nodeMap,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags,
    }

    drawLinks(drawLinksParam)
    drawRefChildrenLinks(drawLinksParam)

    // Draw repeat from links only when in 'link' mode
    if (loopingPathMode === LoopingPathMode.LINK) {
      drawLoopBackLinks(drawLinksParam)
    }

    // Draw nodes
    const nodes = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)

    const shouldSkipDrawingNodeRectangle = (node: EventTreeNode): boolean =>
      isEmojiOnlyNode(node, isCompact, showContinuesTags, showLoopingIndicator)

    // Draw node glow rectangles
    nodes.each(function (d) {
      if (shouldSkipDrawingNodeRectangle(d.data)) return

      const nodeElement = select(this)
      const [nodeWidth, nodeHeight] = getDimensions(d.data)
      const nodeGlowWidth = nodeWidth + NODE_BOX.GLOW_SIZE
      const nodeGlowHeight = nodeHeight + NODE_BOX.GLOW_SIZE
      const nodeType = hasCustomNodeType(d.data) ? 'custom' : d.data.type || 'default'

      nodeElement
        .append('rect')
        .attr('width', nodeGlowWidth)
        .attr('height', nodeGlowHeight)
        .attr('x', -nodeGlowWidth / 2)
        .attr('y', -nodeGlowHeight / 2)
        .attr('class', cx('event-node-glow', `event-node-glow--${nodeType}`))
        .attr('filter', 'url(#event-glow)')
    })

    // Draw node rectangles
    nodes.each(function (d) {
      if (shouldSkipDrawingNodeRectangle(d.data)) return

      const nodeElement = select(this)
      const [nodeWidth, nodeHeight] = getDimensions(d.data)
      const nodeType = hasCustomNodeType(d.data) ? 'custom' : d.data.type || 'default'

      nodeElement
        .append('rect')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('class', cx('event-node', `event-node--${nodeType}`))
    })

    // Add main node content
    nodes.each(function (d) {
      renderNodeContent(select(this), d.data, {
        getDimensions,
        root: root as HierarchyPointNode<EventTreeNode>,
        showLoopingIndicator,
        showContinuesTags,
        isCompact,
        levelOfDetail,
      })
    })

    const drawBadgesParam = {
      g,
      root,
      nodeMap,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags,
    }

    drawDialogueBadge(drawBadgesParam)
    drawEndBadge(drawBadgesParam)
    drawCombatBadge(drawBadgesParam)
    drawSpecialBadge(drawBadgesParam)
    drawResultBadge(drawBadgesParam)

    if (loopingPathMode === LoopingPathMode.LINK) {
      drawLoopBackLinkBadges(drawBadgesParam)
    }

    // Center the scroll horizontally when zoomed
    if (zoomScale && scrollWrapperRef.current) {
      const wrapper = scrollWrapperRef.current
      // Center horizontally: (scrollWidth - clientWidth) / 2
      wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2
    }

    // Cleanup: clear dimension cache when component unmounts or event changes
    return () => {
      clearEventCache(event.name)
    }
    // NOTE: zoomCalculator is a stable dependency, so we don't need to include it here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, zoomLevel, loopingPathMode, levelOfDetail, showContinuesTags])

  return (
    <div className={cx('container')}>
      <div className={cx('container__breadcrumbs')}>
        <GradientLink
          text="← All events"
          onClick={onAllEventsClick}
          className={cx('container__breadcrumbs-link')}
        />
      </div>
      <div className={cx('event-header')}>
        <Image
          src={eventImageSrc}
          alt={event.name}
          width={40}
          height={40}
          className={cx('event-header__artwork')}
          onError={onImageSrcError}
        />
        <div className={cx('event-header__title')}>
          <h3 className={cx('event-header__title__name')}>{event.name}</h3>
          {event.deprecated && (
            <p className={cx('event-header__title__deprecated')}>
              ⚠️ &nbsp;Not in the game anymore!
            </p>
          )}
          {event.alias && !event.deprecated && (
            <p className={cx('event-header__title__alias')}>
              🏷 &nbsp;Alias:{' '}
              <span className={cx('event-header__title__alias__text')}>{event.alias}</span>
            </p>
          )}
        </div>
      </div>

      <div
        ref={scrollWrapperRef}
        className={cx('event-tree-scroll-wrapper', {
          'event-tree-scroll-wrapper--dragging': isDragMode && isDragging,
          'event-tree-scroll-wrapper--drag-mode': isDragMode,
          'event-tree-scroll-wrapper--cover-zoom': zoomLevel === ZoomLevel.COVER,
        })}
        {...(isDragMode ? handlers : {})}
      >
        <svg
          ref={svgRef}
          className={cx('event-tree', {
            'event-tree--zoomed': zoomLevel !== ZoomLevel.COVER,
          })}
        />
      </div>
    </div>
  )
}

export default EventTree
