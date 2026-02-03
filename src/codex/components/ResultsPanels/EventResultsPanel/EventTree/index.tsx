import { useEffect, useRef } from 'react'

import { select, Selection } from 'd3-selection'
import { hierarchy, tree, HierarchyPointNode } from 'd3-hierarchy'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { truncateLine } from '@/shared/utils/textHelper'
import GradientLink from '@/shared/components/GradientLink'
import { useDraggable } from '@/shared/hooks/useDraggable'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import {
  CombatNode,
  DialogueNode,
  EndNode,
  Event,
  EventTreeNode,
  SpecialNode,
} from '@/codex/types/events'
import {
  calculateTreeBounds,
  findNodeById,
  buildNodeMap,
  isEmojiOnlyNode,
  hasCustomNodeType,
} from '@/codex/utils/eventTreeHelper'
import {
  hasEffects,
  getNodeDimensions,
  cacheAllNodeDimensions,
  getNodeTextOrChoiceLabel,
  hasContinues,
  calculateEffectsBoxDimensions,
  calculateRequirementsBoxDimensions,
  calculateIndicatorDimensions,
  tweakLoopIndicatorHeightForChoiceNode,
  getEmojiMargin,
  hasChoiceLabel,
  hasText,
} from '@/codex/utils/eventNodeDimensions'
import {
  adjustHorizontalNodeSpacing,
  adjustVerticalNodeSpacing,
  centerRootNodeHorizontally,
} from '@/codex/utils/eventTreeSpacing'
import { clearEventCache } from '@/codex/utils/eventNodeDimensionCache'
import { NODE, TREE, TEXT, INNER_BOX, NODE_BOX } from '@/codex/constants/eventTreeValues'
import {
  ZoomLevel,
  LoopingPathMode,
  TreeNavigationMode,
  LevelOfDetail,
} from '@/codex/constants/eventSearchValues'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { wrapEventText } from '@/codex/utils/eventTextWidthEstimation'
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

    // Add main node text content
    nodes.each(function (d) {
      const node = select(this)
      const data = d.data

      // For choice nodes, show the choice label
      if (data.type === 'choice') {
        const requirements = data.requirements || []
        const { height: reqBoxHeight, margin: reqBoxMarginBase } =
          calculateRequirementsBoxDimensions(data, data.choiceLabel.length > 0)
        // Since choice labels have such a large height we can use a smaller margin for the requirements box
        const reqBoxMargin = reqBoxMarginBase / 2

        const hasLoopingIndicator = showLoopingIndicator && data.ref !== undefined
        const { height: loopIndicatorHeightBase, margin: loopIndicatorMargin } =
          calculateIndicatorDimensions(
            'loop',
            hasLoopingIndicator,
            data.choiceLabel.length > 0,
            reqBoxHeight > 0
          )

        const loopIndicatorHeight = tweakLoopIndicatorHeightForChoiceNode(
          loopIndicatorHeightBase,
          isCompact
        )

        const [currentNodeWidth, currentNodeHeight] = getDimensions(data)

        if (hasChoiceLabel(data)) {
          renderChoiceLabel(
            node,
            data.choiceLabel,
            currentNodeWidth,
            currentNodeHeight,
            reqBoxMargin,
            reqBoxHeight,
            loopIndicatorHeight,
            loopIndicatorMargin
          )
        }

        const requirementsBoxY =
          currentNodeHeight / 2 -
          NODE_BOX.VERTICAL_PADDING -
          reqBoxHeight -
          loopIndicatorMargin -
          loopIndicatorHeight

        renderRequirementsBox(node, requirements, currentNodeWidth, reqBoxHeight, requirementsBoxY)
      } else if (data.type === 'end') {
        const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
          calculateIndicatorDimensions(
            'loop',
            Boolean(showLoopingIndicator && data.ref !== undefined),
            !isCompact && hasText(data),
            false
          )

        const [currentNodeWidth, currentNodeHeight] = getDimensions(data)

        const nodeHasText = !isCompact && hasText(data)
        const { height: effectsBoxHeight, margin: effectsBoxMargin } =
          calculateEffectsBoxDimensions(data, currentNodeWidth, isCompact, nodeHasText)

        const otherNodeContentHeight =
          effectsBoxMargin + effectsBoxHeight + loopIndicatorMargin + loopIndicatorHeight

        renderNodeText(
          node,
          data,
          currentNodeWidth,
          currentNodeHeight,
          otherNodeContentHeight,
          levelOfDetail
        )
      } else if (data.type === 'dialogue') {
        const [currentNodeWidth, currentNodeHeight] = getDimensions(data)

        const nodeHasText = !isCompact && hasText(data)
        const { height: effectsBoxHeight, margin: effectsBoxMargin } =
          calculateEffectsBoxDimensions(data, currentNodeWidth, isCompact, nodeHasText)

        const { height: continueIndicatorHeight, margin: continueIndicatorMargin } =
          calculateIndicatorDimensions(
            'continue',
            Boolean(showContinuesTags && data.numContinues),
            nodeHasText,
            effectsBoxHeight > 0
          )
        const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
          calculateIndicatorDimensions(
            'loop',
            Boolean(showLoopingIndicator && data.ref !== undefined),
            nodeHasText,
            effectsBoxHeight > 0 || continueIndicatorHeight > 0
          )
        const otherNodeContentHeight =
          effectsBoxMargin +
          effectsBoxHeight +
          continueIndicatorMargin +
          continueIndicatorHeight +
          loopIndicatorMargin +
          loopIndicatorHeight

        renderNodeText(
          node,
          data,
          currentNodeWidth,
          currentNodeHeight,
          otherNodeContentHeight,
          levelOfDetail
        )
      } else if (data.type === 'combat') {
        const [currentNodeWidth, currentNodeHeight] = getDimensions(data)

        const nodeHasText = !isCompact && hasText(data)
        const { height: effectsBoxHeight, margin: effectsBoxMargin } =
          calculateEffectsBoxDimensions(data, currentNodeWidth, isCompact, nodeHasText)

        const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
          calculateIndicatorDimensions(
            'loop',
            Boolean(showLoopingIndicator && data.ref !== undefined),
            nodeHasText,
            effectsBoxHeight > 0
          )
        const otherNodeContentHeight =
          effectsBoxMargin + effectsBoxHeight + loopIndicatorMargin + loopIndicatorHeight

        renderNodeText(
          node,
          data,
          currentNodeWidth,
          currentNodeHeight,
          otherNodeContentHeight,
          levelOfDetail
        )
      } else if (data.type === 'special') {
        const [currentNodeWidth, currentNodeHeight] = getDimensions(data)

        const nodeHasText = hasText(data)
        const { height: effectsBoxHeight, margin: effectsBoxMargin } =
          calculateEffectsBoxDimensions(data, currentNodeWidth, isCompact, nodeHasText)

        const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
          calculateIndicatorDimensions(
            'loop',
            Boolean(showLoopingIndicator && data.ref !== undefined),
            nodeHasText,
            effectsBoxHeight > 0
          )
        const otherNodeContentHeight =
          effectsBoxMargin + effectsBoxHeight + loopIndicatorMargin + loopIndicatorHeight

        renderNodeText(
          node,
          data,
          currentNodeWidth,
          currentNodeHeight,
          otherNodeContentHeight,
          levelOfDetail
        )
      } else if (data.type === 'result') {
        const requirements = data.requirements || []
        const { height: reqBoxHeight } = calculateRequirementsBoxDimensions(data, false)

        const hasLoopingIndicator = showLoopingIndicator && data.ref !== undefined
        const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
          calculateIndicatorDimensions('loop', hasLoopingIndicator, false, reqBoxHeight > 0)

        const [currentNodeWidth, currentNodeHeight] = getDimensions(data)

        const requirementsBoxY =
          currentNodeHeight / 2 -
          NODE_BOX.VERTICAL_PADDING -
          reqBoxHeight -
          loopIndicatorMargin -
          loopIndicatorHeight

        renderRequirementsBox(node, requirements, currentNodeWidth, reqBoxHeight, requirementsBoxY)
      }
    })

    // Add `Effect` boxes (for end, dialogue, and combat nodes that have effects)
    nodes
      .filter((d) => hasEffects(d.data))
      .each(function (d) {
        const node = select(this)
        const eventNode = d.data as DialogueNode | EndNode | CombatNode | SpecialNode
        const effects = eventNode.effects ?? []
        const [nodeWidth, nodeHeight] = getDimensions(d.data)
        const nodeHasText = !isCompact && hasText(eventNode)
        const { height: effectsBoxHeight } = calculateEffectsBoxDimensions(
          eventNode,
          nodeWidth,
          isCompact,
          nodeHasText
        )
        const { height: continueIndicatorHeight, margin: continueIndicatorMargin } =
          calculateIndicatorDimensions(
            'continue',
            Boolean(showContinuesTags && eventNode.type === 'dialogue' && eventNode.numContinues),
            nodeHasText,
            effectsBoxHeight > 0
          )
        const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
          calculateIndicatorDimensions(
            'loop',
            Boolean(showLoopingIndicator && eventNode.ref !== undefined),
            nodeHasText,
            effectsBoxHeight > 0 || continueIndicatorHeight > 0
          )

        renderEffectsBox(
          node,
          effects,
          nodeWidth,
          nodeHeight,
          effectsBoxHeight,
          continueIndicatorHeight,
          continueIndicatorMargin,
          loopIndicatorHeight,
          loopIndicatorMargin,
          isCompact
        )
      })

    // Add `Continue` indicators
    if (showContinuesTags) {
      nodes
        .filter((d) => hasContinues(d.data))
        .each(function (d) {
          const node = select(this)
          const [nodeWidth, nodeHeight] = getDimensions(d.data)
          const showLoopsBackTo = d.data.ref !== undefined && showLoopingIndicator
          const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
            calculateIndicatorDimensions('loop', showLoopsBackTo, !isCompact, true)

          const numContinues = hasContinues(d.data) ? (d.data.numContinues ?? 0) : 0

          renderContinueIndicator(
            node,
            nodeWidth,
            nodeHeight,
            numContinues,
            loopIndicatorHeight,
            loopIndicatorMargin,
            isCompact
          )
        })
    }

    if (loopingPathMode === LoopingPathMode.INDICATOR) {
      nodes
        .filter((d) => d.data.ref !== undefined)
        .each(function (d) {
          const node = select(this)
          const [nodeWidth, nodeHeight] = getDimensions(d.data)

          const { height: loopIndicatorHeight } = calculateIndicatorDimensions(
            'loop',
            true,
            !isCompact,
            false
          )

          renderLoopIndicator(
            node,
            d.data,
            root as HierarchyPointNode<EventTreeNode>,
            nodeWidth,
            nodeHeight,
            loopIndicatorHeight,
            isCompact
          )
        })
    }

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
        <h3 className={cx('event-header__name')}>{event.name}</h3>
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

// - - - - - - - Helper functions - - - - - - -

function renderNodeText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  data: DialogueNode | EndNode | CombatNode | SpecialNode,
  currentNodeWidth: number,
  currentNodeHeight: number,
  otherNodeContentHeight: number,
  levelOfDetail: LevelOfDetail
) {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT
  const nodeHasText = !isCompact && hasText(data)
  if (!nodeHasText || !data.text) return

  const maxDisplayLines = TEXT.MAX_DISPLAY_LINES_BY_LEVEL_OF_DETAIL[levelOfDetail]
  const nodeType = data.type
  const emojiMargin = getEmojiMargin(node, levelOfDetail)

  const textAreaHeight = currentNodeHeight - NODE_BOX.VERTICAL_PADDING * 2 - otherNodeContentHeight
  const textAreaCenter = -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

  const maxTextWidth = currentNodeWidth - TEXT.HORIZONTAL_PADDING * 2
  const wrappedLines = wrapEventText(
    data.text,
    maxTextWidth,
    nodeType === 'special' ? 'special' : undefined
  )
  const displayLines = wrappedLines.slice(0, maxDisplayLines)

  if (wrappedLines.length > maxDisplayLines && displayLines[displayLines.length - 1]) {
    const lastLineIndex = displayLines.length - 1
    displayLines[lastLineIndex] = truncateLine(displayLines[lastLineIndex])
  }

  const lineHeight = nodeType === 'special' ? TEXT.SPECIAL_TEXT_HEIGHT : TEXT.LINE_HEIGHT
  const baselineOffset =
    nodeType === 'special' ? TEXT.SPECIAL_BASELINE_OFFSET : TEXT.BASELINE_OFFSET
  const totalTextHeight = displayLines.length * lineHeight
  const verticalCenteringOffset =
    textAreaCenter + emojiMargin - totalTextHeight / 2 + baselineOffset

  displayLines.forEach((line, i) => {
    const y = i * lineHeight + verticalCenteringOffset

    node
      .append('text')
      .attr('class', cx('event-node-text', `event-node-text--${nodeType}`))
      .attr('x', 0)
      .attr('y', y)
      .text(line)
  })
}

function renderChoiceLabel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  choiceLabel: string,
  currentNodeWidth: number,
  currentNodeHeight: number,
  reqBoxMargin: number,
  reqBoxHeight: number,
  loopIndicatorHeight: number,
  loopIndicatorMargin: number
) {
  const textAreaHeight =
    currentNodeHeight -
    NODE_BOX.VERTICAL_PADDING * 2 -
    reqBoxMargin -
    reqBoxHeight -
    loopIndicatorHeight -
    loopIndicatorMargin
  const textAreaCenter = -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

  const labelGroup = node.append('g').attr('transform', `translate(0, ${textAreaCenter})`)

  const maxTextWidth = currentNodeWidth - TEXT.HORIZONTAL_PADDING * 2
  const choiceLines = wrapEventText(choiceLabel, maxTextWidth, 'choice')

  // Center the text lines vertically within the label group
  const totalTextHeight = choiceLines.length * TEXT.CHOICE_TEXT_HEIGHT
  const verticalCenteringOffset = -totalTextHeight / 2 + TEXT.CHOICE_BASELINE_OFFSET

  choiceLines.forEach((line, i) => {
    const yPosition = i * TEXT.CHOICE_TEXT_HEIGHT + verticalCenteringOffset

    labelGroup
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--choice'))
      .attr('x', 0)
      .attr('y', yPosition)
      .text(line)
  })
}

function renderEffectsBox(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  effects: string[],
  nodeWidth: number,
  nodeHeight: number,
  effectsBoxHeight: number,
  continueHeight: number,
  continueMargin: number,
  loopIndicatorHeight: number,
  loopIndicatorMargin: number,
  isCompact: boolean
) {
  const maxEffectWidth = nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
  const effectLines = effects.flatMap((effect) => wrapEventText(effect, maxEffectWidth))

  const effectsBoxY =
    nodeHeight / 2 -
    NODE_BOX.VERTICAL_PADDING -
    effectsBoxHeight -
    continueMargin -
    continueHeight -
    loopIndicatorMargin -
    loopIndicatorHeight

  const effectsGroup = node.append('g').attr('transform', `translate(0, ${effectsBoxY})`)

  effectsGroup
    .append('rect')
    .attr('class', cx('inner-box'))
    .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING)
    .attr('y', 0)
    .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('height', effectsBoxHeight)

  // Add "Effect:" label inside dark box
  const effectsHeaderHeight = isCompact ? 0 : TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP
  const contentHeight = effectsHeaderHeight + effectLines.length * TEXT.LINE_HEIGHT
  const listingTopPadding = (effectsBoxHeight - contentHeight) / 2

  if (!isCompact) {
    effectsGroup
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--effect-header'))
      .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
      .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
      .text('Effect:')
  }

  effectLines.forEach((effect, i) => {
    effectsGroup
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--effect-item'))
      .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
      .attr('y', listingTopPadding / 2 + effectsHeaderHeight + (i + 1) * TEXT.LINE_HEIGHT)
      .text(effect)
  })
}

function renderRequirementsBox(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  requirements: string[],
  currentNodeWidth: number,
  reqBoxHeight: number,
  requirementsBoxY: number
) {
  if (requirements.length === 0) return

  const reqGroup = node.append('g').attr('transform', `translate(0, ${requirementsBoxY})`)

  reqGroup
    .append('rect')
    .attr('class', cx('inner-box'))
    .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING)
    .attr('y', 0)
    .attr('width', currentNodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('height', reqBoxHeight)

  const contentHeight =
    TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP + requirements.length * TEXT.LINE_HEIGHT
  const listingTopPadding = (reqBoxHeight - contentHeight) / 2

  reqGroup
    .append('text')
    .attr('class', cx('event-node-text', 'event-node-text--requirement-header'))
    .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
    .text('Requires:')

  requirements.forEach((req: string, i: number) => {
    reqGroup
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--requirement-item'))
      .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
      .attr(
        'y',
        listingTopPadding +
          TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          (i + 1) * TEXT.BASELINE_OFFSET
      )
      .text(req)
  })
}

function renderContinueIndicator(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  nodeWidth: number,
  nodeHeight: number,
  numContinues: number,
  loopIndicatorHeight: number,
  loopIndicatorMargin: number,
  isCompact: boolean
) {
  const continueIndicatorY =
    nodeHeight / 2 -
    NODE_BOX.VERTICAL_PADDING -
    INNER_BOX.INDICATOR_HEIGHT -
    loopIndicatorMargin -
    loopIndicatorHeight
  const continueText = isCompact ? `⏭️ × ${numContinues}` : `⏭️ Continues: ${numContinues}`

  const continueIndicator = node
    .append('g')
    .attr('transform', `translate(0, ${continueIndicatorY})`)

  continueIndicator
    .append('rect')
    .attr('class', cx('indicator-box'))
    .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING)
    .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('height', INNER_BOX.INDICATOR_HEIGHT)

  continueIndicator
    .append('text')
    .attr('class', cx('event-node-text', 'event-node-text--indicator'))
    .attr('y', INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 2)
    .text(continueText)
}

function renderLoopIndicator(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  data: EventTreeNode,
  root: HierarchyPointNode<EventTreeNode>,
  nodeWidth: number,
  nodeHeight: number,
  loopIndicatorHeight: number,
  isCompact: boolean
) {
  const refNode = findNodeById(root, data.ref)
  const refNodeLabel = getNodeTextOrChoiceLabel(refNode)

  const labelText = refNodeLabel || ''
  const maxTextWidth = nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
  const refNodeLines = wrapEventText(labelText, maxTextWidth)
  const displayLine = refNodeLines[0] || ''
  const truncatedLine = displayLine === labelText ? displayLine : `${displayLine.slice(0, -3)}...`

  const loopIndicatorY = nodeHeight / 2 - NODE_BOX.VERTICAL_PADDING - loopIndicatorHeight
  const loopIndicatorText = isCompact ? `🔄 ${truncatedLine}` : `🔄 Loops back to:`
  const loopIndicatorTextClass = isCompact
    ? 'event-node-text--indicator-label'
    : 'event-node-text--indicator'
  const loopIndicatorTextY = INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 2

  const loopIndicator = node.append('g').attr('transform', `translate(0, ${loopIndicatorY})`)

  loopIndicator
    .append('rect')
    .attr('class', cx('indicator-box'))
    .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING)
    .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 2)
    .attr('height', loopIndicatorHeight)

  loopIndicator
    .append('text')
    .attr('class', cx('event-node-text', loopIndicatorTextClass))
    .attr('y', loopIndicatorTextY)
    .text(loopIndicatorText)

  if (!isCompact) {
    loopIndicator
      .append('text')
      .attr('class', cx('event-node-text', 'event-node-text--indicator-label'))
      .attr(
        'y',
        TEXT.LINE_HEIGHT +
          INNER_BOX.INDICATOR_HEADER_GAP +
          TEXT.LINE_HEIGHT / 2 +
          TEXT.BASELINE_OFFSET
      )
      .text(truncatedLine)
  }
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
