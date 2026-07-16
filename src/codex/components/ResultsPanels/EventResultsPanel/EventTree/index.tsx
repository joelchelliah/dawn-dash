import { memo, useEffect, useMemo, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, HierarchyPointNode } from 'd3-hierarchy'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'
import { useDraggable } from '@/shared/hooks/useDraggable'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { Event, EventTreeNode } from '@/codex/types/events'
import { isEmojiOnlyNode, hasCustomNodeType } from '@/codex/utils/eventTreeHelper'
import { buildNodeMap, calculateTreeBounds } from '@/codex/utils/tree/treeHelper'
import {
  getNodeDimensions,
  cacheAllNodeDimensions,
  clearEventCache,
} from '@/codex/utils/eventNodeDimensions'
import {
  adjustHorizontalNodeSpacing,
  adjustVerticalNodeSpacing,
  centerRootNodeHorizontally,
} from '@/codex/utils/eventTreeSpacing'
import { setupTreeSvg, createGlowFilter } from '@/codex/utils/tree/svgHelper'
import { TREE, NODE_BOX } from '@/codex/constants/eventTreeValues'
import { ZoomLevel } from '@/codex/constants/zoomValues'
import {
  LoopingPathMode,
  TreeNavigationMode,
  LevelOfDetail,
} from '@/codex/constants/eventSearchValues'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'

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
import { renderNodeContent } from './nodes'
import styles from './index.module.scss'

const cx = createCx(styles)

interface EventTreeProps {
  event: Event
  zoomLevel: ZoomLevel
  levelOfDetail: LevelOfDetail
  loopingPathMode: LoopingPathMode
  navigationMode: TreeNavigationMode
  showContinuesTags: boolean
  onAllEventsClick: () => void
}

function EventTree({
  event,
  zoomLevel,
  levelOfDetail,
  loopingPathMode,
  navigationMode,
  showContinuesTags,
  onAllEventsClick,
}: EventTreeProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollWrapperRef = useRef<HTMLDivElement>(null)

  const { eventImageSrc, onImageSrcError } = useEventImageSrc(event.artwork)
  const zoomCalculator = useEventTreeZoom()
  const { isMobile } = useBreakpoint()
  const { isDragging, handlers } = useDraggable(scrollWrapperRef)

  // Force scroll mode on mobile (touch scrolling works like dragging on mobile)
  const isDragMode = !isMobile && navigationMode === TreeNavigationMode.DRAG

  const showLoopingIndicator = loopingPathMode === LoopingPathMode.INDICATOR

  // Layout computation: node dimensions, tree layout, and the spacing passes.
  // Deliberately independent of zoomLevel, so zooming only re-renders (below)
  // without re-running dimension caching or the spacing engine.
  const layout = useMemo(() => {
    if (!event.rootNode) return null

    const root = hierarchy(event.rootNode, (d) => d.children)
    const nodeMap = buildNodeMap(root, (node) => node.id)

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

    // flextree computes all node positions (variable-width tidy layout +
    // multi-parent centering); no d3 tree() pre-layout is needed.
    adjustHorizontalNodeSpacing(
      nodeMap,
      root,
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

    const bounds = calculateTreeBounds(root, (node) => getDimensions(node.data))
    const calculatedWidth = bounds.width + TREE.HORIZONTAL_PADDING * 2
    const verticalPadding = TREE.VERTICAL_PADDING_BY_LEVEL_OF_DETAIL[levelOfDetail]

    const svgWidth = Math.max(calculatedWidth, TREE.MIN_SVG_WIDTH)
    const svgHeight = bounds.height + verticalPadding * 2

    const offsetX = -bounds.minX + TREE.HORIZONTAL_PADDING

    centerRootNodeHorizontally(root as HierarchyPointNode<EventTreeNode>, svgWidth, offsetX)

    // Center the tree vertically
    const offsetY = -bounds.minY + verticalPadding

    return { root, nodeMap, getDimensions, svgWidth, svgHeight, offsetX, offsetY }
  }, [event, showLoopingIndicator, levelOfDetail, showContinuesTags])

  // Clear the dimension cache when the component unmounts or the event changes.
  // (The cache is keyed on event + rendering settings, so entries for other
  // settings of the same event stay valid and can be reused.)
  useEffect(() => {
    return () => {
      clearEventCache(event.name)
    }
  }, [event.name])

  // Render effect: draws the precomputed layout at the current zoom level
  useEffect(() => {
    if (!svgRef.current || !layout || !scrollWrapperRef.current) return

    const { root, nodeMap, getDimensions, svgWidth, svgHeight, offsetX, offsetY } = layout
    const isCompact = levelOfDetail === LevelOfDetail.COMPACT

    // Clear previous visualization
    select(svgRef.current).selectAll('*').remove()

    const zoomScale = zoomCalculator.calculate({
      eventName: event.name,
      zoomLevel,
      svgWidth,
      svgHeight,
      containerWidth: scrollWrapperRef.current.clientWidth,
      containerHeight: scrollWrapperRef.current.clientHeight,
    })

    const { defs, contentGroup: g } = setupTreeSvg(svgRef.current, {
      width: svgWidth,
      height: svgHeight,
      zoomScale,
      offsetX,
      offsetY,
      preserveAspectRatio: 'xMidYMin meet',
    })

    createGlowFilter(defs, 'event-glow')

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
  }, [
    layout,
    zoomLevel,
    loopingPathMode,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags,
    event,
    zoomCalculator,
  ])

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

export default memo(EventTree)
