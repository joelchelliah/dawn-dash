import { useEffect, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree, HierarchyPointNode } from 'd3-hierarchy'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { wrapText, truncateLine } from '@/shared/utils/textHelper'
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
  getNodeHeight,
  getNodeWidth,
  calculateTreeBounds,
  hasEffects,
  findNodeById,
  createGlowFilter,
} from '@/codex/utils/eventTreeHelper'
import {
  adjustHorizontalNodeSpacing,
  adjustVerticalNodeSpacing,
  centerRootNodeHorizontally,
} from '@/codex/utils/eventTreeSpacing'
import { NODE, TREE, TEXT, INNER_BOX, NODE_BOX } from '@/codex/constants/eventTreeValues'
import { ZoomLevel, LoopingPathMode, TreeNavigationMode } from '@/codex/constants/eventSearchValues'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'

import { drawLinks, drawRefChildrenLinks, drawLoopBackLinks, drawLoopBackLinkBadges } from './links'
import { useEventTreeZoom } from './useEventTreeZoom'
import styles from './index.module.scss'

const cx = createCx(styles)

interface EventTreeProps {
  event: Event
  zoomLevel: ZoomLevel
  loopingPathMode: LoopingPathMode
  navigationMode: TreeNavigationMode
  onAllEventsClick: () => void
}

function EventTree({
  event,
  zoomLevel,
  loopingPathMode,
  navigationMode,
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

  useEffect(() => {
    if (!svgRef.current || !event.rootNode || !scrollWrapperRef.current) return

    // Clear previous visualization
    select(svgRef.current).selectAll('*').remove()

    const root = hierarchy(event.rootNode, (d) => d.children)

    const treeLayout = tree<EventTreeNode>()
      .nodeSize([NODE.HORIZONTAL_SPACING_DEFAULT, NODE.VERTICAL_SPACING_DEFAULT])
      .separation(() => 1)

    treeLayout(root)

    adjustHorizontalNodeSpacing(root as HierarchyPointNode<EventTreeNode>, event)
    adjustVerticalNodeSpacing(
      root as HierarchyPointNode<EventTreeNode>,
      event,
      showLoopingIndicator
    )

    const bounds = calculateTreeBounds(root, event, showLoopingIndicator)
    const calculatedWidth = bounds.width + TREE.HORIZONTAL_PADDING * 2
    const svgWidth = Math.max(calculatedWidth, TREE.MIN_SVG_WIDTH)
    const svgHeight = bounds.height + TREE.VERTICAL_PADDING * 2

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
    const offsetY = -bounds.minY + TREE.VERTICAL_PADDING

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

    drawLinks(g, defs, root, event, showLoopingIndicator)
    drawRefChildrenLinks(g, defs, root, event, showLoopingIndicator)

    // Draw repeat from links only when in 'link' mode
    if (loopingPathMode === LoopingPathMode.LINK) {
      drawLoopBackLinks(g, defs, root, event)
    }

    // Draw nodes
    const nodes = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)

    // Draw node glow rectangles
    nodes.each(function (d) {
      const nodeElement = select(this)
      const nodeWidth = getNodeWidth(d.data, event)
      const nodeHeight = getNodeHeight(d.data, event, showLoopingIndicator)
      const nodeGlowWidth = nodeWidth + NODE_BOX.GLOW_SIZE
      const nodeGlowHeight = nodeHeight + NODE_BOX.GLOW_SIZE

      const nodeType = d.data.type || 'default'
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
    nodes
      .append('rect')
      .attr('class', (d) => cx('event-node', `event-node--${d.data.type}`))
      .attr('x', (d) => -getNodeWidth(d.data, event) / 2)
      .attr('y', (d) => -getNodeHeight(d.data, event, showLoopingIndicator) / 2)
      .attr('width', (d) => getNodeWidth(d.data, event))
      .attr('height', (d) => getNodeHeight(d.data, event, showLoopingIndicator))

    // Add main node text content
    nodes.each(function (d) {
      const node = select(this)
      const data = d.data

      // For choice nodes, show the choice label
      if (data.type === 'choice') {
        const requirements = data.requirements || []
        const hasRequirements = requirements.length > 0
        const reqBoxHeight = hasRequirements
          ? TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            requirements.length * TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_VERTICAL_PADDING
          : 0
        const hasContinue = data.numContinues && data.numContinues > 0
        const continueIndicatorHeight = hasContinue ? INNER_BOX.INDICATOR_HEIGHT : 0
        const continueIndicatorMargin = hasContinue ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        const hasLoopingIndicator = showLoopingIndicator && data.ref
        const loopIndicatorHeight = hasLoopingIndicator
          ? INNER_BOX.INDICATOR_HEIGHT + TEXT.LINE_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP
          : 0
        const loopIndicatorMargin = hasLoopingIndicator ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

        const currentNodeHeight = getNodeHeight(data, event, showLoopingIndicator)
        const currentNodeWidth = getNodeWidth(data, event)
        const reqBoxMargin = reqBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0

        // The text area is: total height minus vertical padding, bottom boxes and their margin
        const textAreaHeight =
          currentNodeHeight -
          NODE_BOX.VERTICAL_PADDING * 2 -
          reqBoxMargin -
          reqBoxHeight -
          continueIndicatorHeight -
          continueIndicatorMargin -
          loopIndicatorHeight -
          loopIndicatorMargin

        // Center the text within this area, offset by top padding
        const textAreaCenter =
          -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

        const labelGroup = node.append('g').attr('transform', `translate(0, ${textAreaCenter})`)

        const isDefault = data.choiceLabel === 'default'
        const choiceLines = isDefault
          ? [data.choiceLabel]
          : wrapText(data.choiceLabel, currentNodeWidth - TEXT.HORIZONTAL_PADDING)

        // Center the text lines vertically within the label group
        const totalTextHeight = choiceLines.length * TEXT.CHOICE_TEXT_HEIGHT
        const defaultChoiceOffset = isDefault ? 0.125 * TEXT.CHOICE_TEXT_HEIGHT : 0
        const verticalCenteringOffset =
          -totalTextHeight / 2 + TEXT.CHOICE_BASELINE_OFFSET + defaultChoiceOffset

        choiceLines.forEach((line, i) => {
          const yPosition = i * TEXT.CHOICE_TEXT_HEIGHT + verticalCenteringOffset
          const text = isDefault ? '—' : line

          labelGroup
            .append('text')
            .attr(
              'class',
              cx('event-node-text', 'event-node-text--choice', {
                'event-node-text--choice--default': isDefault,
              })
            )
            .attr('x', 0)
            .attr('y', yPosition)
            .text(text)
        })

        const requirementsBoxY =
          currentNodeHeight / 2 -
          NODE_BOX.VERTICAL_PADDING -
          reqBoxHeight -
          continueIndicatorMargin -
          continueIndicatorHeight -
          loopIndicatorMargin -
          loopIndicatorHeight

        // Add requirements box if present (above continue indicator and loop indicator)
        if (hasRequirements) {
          const reqGroup = node.append('g').attr('transform', `translate(0, ${requirementsBoxY})`)

          reqGroup
            .append('rect')
            .attr('class', cx('inner-box'))
            .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN)
            .attr('y', 0)
            .attr('width', currentNodeWidth - INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('height', reqBoxHeight)

          // Add "Requires:" label inside inner box
          const contentHeight =
            TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            requirements.length * TEXT.LINE_HEIGHT
          const listingTopPadding = (reqBoxHeight - contentHeight) / 2
          reqGroup
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--requirement-header'))
            .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
            .text('Requires:')

          // Add each requirement on its own line
          requirements.forEach((req, i) => {
            reqGroup
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--requirement-item'))
              .attr('x', -currentNodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
              .attr(
                'y',
                listingTopPadding +
                  TEXT.LINE_HEIGHT +
                  INNER_BOX.LISTINGS_HEADER_GAP +
                  (i + 1) * TEXT.LINE_HEIGHT
              )
              .text(req)
          })
        }
      } else if (data.type === 'end') {
        // For end nodes, show first 2 lines of text (effects box is handled centrally below)
        const effects = data.effects || []
        const hasEffects = effects.length > 0
        const effectsBoxHeight = hasEffects
          ? TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            effects.length * TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_VERTICAL_PADDING
          : 0
        const loopIndicatorHeight =
          showLoopingIndicator && data.ref
            ? INNER_BOX.INDICATOR_HEIGHT + TEXT.LINE_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP
            : 0

        const currentNodeHeight = getNodeHeight(data, event, showLoopingIndicator)
        const currentNodeWidth = getNodeWidth(data, event)
        const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
        const textAreaHeight =
          currentNodeHeight -
          NODE_BOX.VERTICAL_PADDING * 2 -
          effectsBoxMargin -
          effectsBoxHeight -
          loopIndicatorHeight
        const textAreaCenter =
          -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

        const hasText = data.text && data.text.trim().length > 0

        // Special cases for empty text:
        // - If has effects but no text: only show effects box (no text)
        // - If no effects and no text: show "END" in italic
        if (!hasText && hasEffects) {
          // Empty text with effects: skip text rendering, only show effects box below
        } else if (!hasText && !hasEffects) {
          // Empty text and no effects: show "END" in italic (like combat)
          node
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--no-text-fallback'))
            .attr('x', 0)
            .attr('y', textAreaCenter + TEXT.COMBAT_BASELINE_OFFSET - TEXT.COMBAT_TEXT_HEIGHT / 2)
            .text('END')
        } else {
          const endLines = wrapText(data.text ?? '', currentNodeWidth - TEXT.HORIZONTAL_PADDING)
          const displayLines = endLines.slice(0, TEXT.MAX_DISPLAY_LINES)

          // If there are more lines than we can display, truncate the last line
          if (endLines.length > TEXT.MAX_DISPLAY_LINES && displayLines[displayLines.length - 1]) {
            const lastLineIndex = displayLines.length - 1
            displayLines[lastLineIndex] = truncateLine(displayLines[lastLineIndex])
          }

          // Center the lines vertically based on actual number of lines
          const totalTextHeight = displayLines.length * TEXT.LINE_HEIGHT
          const verticalCenteringOffset = -totalTextHeight / 2 + TEXT.BASELINE_OFFSET

          displayLines.forEach((line, i) => {
            node
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--end'))
              .attr('x', 0)
              .attr('y', textAreaCenter + i * TEXT.LINE_HEIGHT + verticalCenteringOffset)
              .text(line)
          })
        }
      } else if (data.type === 'dialogue') {
        // For dialogue nodes, show dialogue text (effects box is handled centrally below)
        const isRootNode = d.depth === 0
        const effects = data.effects || []
        const hasEffects = effects.length > 0
        const effectsBoxHeight = hasEffects
          ? TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            effects.length * TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_VERTICAL_PADDING
          : 0
        const hasContinue = data.numContinues && data.numContinues > 0
        const continueIndicatorHeight = hasContinue ? INNER_BOX.INDICATOR_HEIGHT : 0
        const loopIndicatorHeight =
          showLoopingIndicator && data.ref
            ? INNER_BOX.INDICATOR_HEIGHT + TEXT.LINE_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP
            : 0
        const continueIndicatorMargin =
          continueIndicatorHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        const loopIndicatorMargin = loopIndicatorHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

        if (isRootNode) {
          // Root node shows up to 2 lines of dialogue text (if present)
          // Event name is now displayed ABOVE the root node
          const currentNodeHeight = getNodeHeight(data, event, showLoopingIndicator)
          const currentNodeWidth = getNodeWidth(data, event)
          const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
          const textAreaHeight =
            currentNodeHeight -
            NODE_BOX.VERTICAL_PADDING * 2 -
            effectsBoxMargin -
            effectsBoxHeight -
            continueIndicatorMargin -
            continueIndicatorHeight -
            loopIndicatorMargin -
            loopIndicatorHeight
          const textAreaCenter =
            -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

          const hasText = data.text && data.text.trim().length > 0

          if (hasText) {
            const dialogueLines = wrapText(data.text, currentNodeWidth - TEXT.HORIZONTAL_PADDING)
            const displayLines = dialogueLines.slice(0, TEXT.MAX_DISPLAY_LINES)

            // If there are more lines than we can display, truncate the last line
            if (
              dialogueLines.length > TEXT.MAX_DISPLAY_LINES &&
              displayLines[displayLines.length - 1]
            ) {
              const lastLineIndex = displayLines.length - 1
              displayLines[lastLineIndex] = truncateLine(displayLines[lastLineIndex])
            }

            // Center the lines vertically based on actual number of lines
            const totalTextHeight = displayLines.length * TEXT.LINE_HEIGHT
            const verticalCenteringOffset = -totalTextHeight / 2 + TEXT.BASELINE_OFFSET

            displayLines.forEach((line, i) => {
              const y = textAreaCenter + i * TEXT.LINE_HEIGHT + verticalCenteringOffset

              node
                .append('text')
                .attr('class', cx('event-node-text', 'event-node-text--dialogue'))
                .attr('x', 0)
                .attr('y', y)
                .text(line)
            })
          }
        } else {
          // Non-root dialogue nodes show max MAX_DISPLAY_LINES
          const currentNodeHeight = getNodeHeight(data, event, showLoopingIndicator)
          const currentNodeWidth = getNodeWidth(data, event)
          const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
          const textAreaHeight =
            currentNodeHeight -
            NODE_BOX.VERTICAL_PADDING * 2 -
            effectsBoxMargin -
            effectsBoxHeight -
            continueIndicatorMargin -
            continueIndicatorHeight -
            loopIndicatorMargin -
            loopIndicatorHeight
          const textAreaCenter =
            -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

          const dialogueLines = wrapText(data.text, currentNodeWidth - TEXT.HORIZONTAL_PADDING)
          const displayLines = dialogueLines.slice(0, TEXT.MAX_DISPLAY_LINES)

          // If there are more lines than we can display, truncate the last line
          if (
            dialogueLines.length > TEXT.MAX_DISPLAY_LINES &&
            displayLines[displayLines.length - 1]
          ) {
            const lastLineIndex = displayLines.length - 1
            displayLines[lastLineIndex] = truncateLine(displayLines[lastLineIndex])
          }

          // Center the lines vertically based on actual number of lines
          const totalTextHeight = displayLines.length * TEXT.LINE_HEIGHT
          const verticalCenteringOffset = -totalTextHeight / 2 + TEXT.BASELINE_OFFSET

          displayLines.forEach((line, i) => {
            const y = textAreaCenter + i * TEXT.LINE_HEIGHT + verticalCenteringOffset

            node
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--dialogue'))
              .attr('x', 0)
              .attr('y', y)
              .text(line)
          })
        }
      } else if (data.type === 'combat') {
        // For combat nodes, show text (up to 2 lines) or "FIGHT!" fallback (effects box is handled centrally below)
        const effects = data.effects || []
        const hasEffects = effects.length > 0
        const effectsBoxHeight = hasEffects
          ? TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            effects.length * TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_VERTICAL_PADDING
          : 0
        const loopIndicatorHeight =
          showLoopingIndicator && data.ref
            ? INNER_BOX.INDICATOR_HEIGHT + TEXT.LINE_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP
            : 0

        const currentNodeHeight = getNodeHeight(data, event, showLoopingIndicator)
        const currentNodeWidth = getNodeWidth(data, event)
        const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
        const loopIndicatorMargin = loopIndicatorHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        // The text area is: total height minus vertical padding, effects box, its margin, and loop indicator
        const textAreaHeight =
          currentNodeHeight -
          NODE_BOX.VERTICAL_PADDING * 2 -
          effectsBoxMargin -
          effectsBoxHeight -
          loopIndicatorMargin -
          loopIndicatorHeight
        // Center the text within this area, offset by top padding
        const textAreaCenter =
          -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

        const hasText = data.text && data.text.trim().length > 0

        if (hasText && data.text) {
          const combatLines = wrapText(data.text, currentNodeWidth - TEXT.HORIZONTAL_PADDING)
          const displayLines = combatLines.slice(0, TEXT.MAX_DISPLAY_LINES)

          // If there are more lines than we can display, truncate the last line
          if (
            combatLines.length > TEXT.MAX_DISPLAY_LINES &&
            displayLines[displayLines.length - 1]
          ) {
            const lastLineIndex = displayLines.length - 1
            displayLines[lastLineIndex] = truncateLine(displayLines[lastLineIndex])
          }

          // Center the lines vertically based on actual number of lines
          const totalTextHeight = displayLines.length * TEXT.LINE_HEIGHT
          const verticalCenteringOffset = -totalTextHeight / 2 + TEXT.BASELINE_OFFSET

          displayLines.forEach((line, i) => {
            const y = textAreaCenter + i * TEXT.LINE_HEIGHT + verticalCenteringOffset

            node
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--combat'))
              .attr('x', 0)
              .attr('y', y)
              .text(line)
          })
        } else {
          // Fallback: Add "FIGHT!" text, centered in available space
          node
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--no-text-fallback'))
            .attr('x', 0)
            .attr('y', textAreaCenter + TEXT.COMBAT_BASELINE_OFFSET - TEXT.COMBAT_TEXT_HEIGHT / 2)
            .text('FIGHT!')
        }
      } else if (data.type === 'special') {
        // For special nodes, show text (up to 2 lines) + effects box (if any) + loops back to box (if present)
        const effects = data.effects || []
        const hasEffects = effects.length > 0
        const effectsBoxHeight = hasEffects
          ? TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            effects.length * TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_VERTICAL_PADDING
          : 0
        const loopIndicatorHeight =
          showLoopingIndicator && data.ref
            ? INNER_BOX.INDICATOR_HEIGHT + TEXT.LINE_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP
            : 0

        const currentNodeHeight = getNodeHeight(data, event, showLoopingIndicator)
        const currentNodeWidth = getNodeWidth(data, event)
        const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
        const loopIndicatorMargin = loopIndicatorHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        // The text area is: total height minus vertical padding, effects box, its margin, and loop indicator
        const textAreaHeight =
          currentNodeHeight -
          NODE_BOX.VERTICAL_PADDING * 2 -
          effectsBoxMargin -
          effectsBoxHeight -
          loopIndicatorMargin -
          loopIndicatorHeight
        // Center the text within this area, offset by top padding
        const textAreaCenter =
          -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

        const hasText = data.text && data.text.trim().length > 0

        if (hasText && data.text) {
          const specialLines = wrapText(data.text, currentNodeWidth - TEXT.HORIZONTAL_PADDING)
          const displayLines = specialLines.slice(0, TEXT.MAX_DISPLAY_LINES)

          // If there are more lines than we can display, truncate the last line
          if (
            specialLines.length > TEXT.MAX_DISPLAY_LINES &&
            displayLines[displayLines.length - 1]
          ) {
            const lastLineIndex = displayLines.length - 1
            displayLines[lastLineIndex] = truncateLine(displayLines[lastLineIndex])
          }

          // Center the lines vertically based on actual number of lines
          const totalTextHeight = displayLines.length * TEXT.LINE_HEIGHT
          const verticalCenteringOffset = -totalTextHeight / 2 + TEXT.BASELINE_OFFSET

          displayLines.forEach((line, i) => {
            const y = textAreaCenter + i * TEXT.LINE_HEIGHT + verticalCenteringOffset
            const text = line === 'default' ? '—' : line

            node
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--special'))
              .attr('x', 0)
              .attr('y', y)
              .text(text)
          })
        }
      }
    })

    // Add `Effect` boxes (for end, dialogue, and combat nodes that have effects)
    nodes
      .filter((d) => hasEffects(d.data))
      .each(function (d) {
        const node = select(this)
        const eventNode = d.data as DialogueNode | EndNode | CombatNode | SpecialNode
        const effects = eventNode.effects ?? []
        const nodeHeight = getNodeHeight(eventNode, event, showLoopingIndicator)
        const nodeWidth = getNodeWidth(eventNode, event)

        const effectsBoxHeight =
          TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          effects.length * TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_VERTICAL_PADDING

        const continueHeight = eventNode.numContinues ? INNER_BOX.INDICATOR_HEIGHT : 0
        const continueMargin = continueHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        const showLoopsBackTo = showLoopingIndicator && eventNode.ref
        const loopIndicatorHeight = showLoopsBackTo
          ? INNER_BOX.INDICATOR_HEIGHT + TEXT.LINE_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP
          : 0
        const loopIndicatorMargin = showLoopsBackTo ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

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
          .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN)
          .attr('y', 0)
          .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN * 2)
          .attr('height', effectsBoxHeight)

        // Add "Effect:" label inside dark box
        const contentHeight =
          TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP + effects.length * TEXT.LINE_HEIGHT
        const listingTopPadding = (effectsBoxHeight - contentHeight) / 2
        effectsGroup
          .append('text')
          .attr('class', cx('event-node-text', 'event-node-text--effect-header'))
          .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
          .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
          .text('Effect:')

        // Add each effect on its own line (left-aligned)
        effects.forEach((effect, i) => {
          effectsGroup
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--effect-item'))
            .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr(
              'y',
              listingTopPadding +
                TEXT.LINE_HEIGHT +
                INNER_BOX.LISTINGS_HEADER_GAP +
                (i + 1) * TEXT.LINE_HEIGHT
            )
            .text(effect)
        })
      })

    // Add `Continue` indicators
    nodes
      .filter((d) => Boolean(d.data.numContinues && d.data.numContinues > 0))
      .each(function (d) {
        const node = select(this)
        const nodeHeight = getNodeHeight(d.data, event, showLoopingIndicator)
        const nodeWidth = getNodeWidth(d.data, event)
        const showLoopsBackTo = d.data.ref && showLoopingIndicator
        const loopIndicatorHeight = showLoopsBackTo
          ? INNER_BOX.INDICATOR_HEIGHT + TEXT.LINE_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP
          : 0
        const loopIndicatorMargin = showLoopsBackTo ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        const numContinues = d.data.numContinues ?? 0

        // Position from bottom: margin is already in nodeHeight, just position the box
        const continueIndicatorY =
          nodeHeight / 2 -
          NODE_BOX.VERTICAL_PADDING -
          INNER_BOX.INDICATOR_HEIGHT -
          loopIndicatorMargin -
          loopIndicatorHeight

        const continueIndicator = node
          .append('g')
          .attr('transform', `translate(0, ${continueIndicatorY})`)

        continueIndicator
          .append('rect')
          .attr('class', cx('indicator-box'))
          .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN)
          .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN * 2)
          .attr('height', INNER_BOX.INDICATOR_HEIGHT)

        continueIndicator
          .append('text')
          .attr('class', cx('event-node-text', 'event-node-text--indicator'))
          .attr('y', INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 1.75)
          .text(`⏭️ Continues: ${numContinues}`)
      })

    // Add `Loops back to` indicators
    if (loopingPathMode === LoopingPathMode.INDICATOR) {
      nodes
        .filter((d) => Boolean(d.data.ref))
        .each(function (d) {
          const node = select(this)
          const nodeHeight = getNodeHeight(d.data, event, showLoopingIndicator)
          const nodeWidth = getNodeWidth(d.data, event)

          const refNode = findNodeById(root as HierarchyPointNode<EventTreeNode>, d.data.ref)
          const refNodeLabel = refNode?.type === 'choice' ? refNode.choiceLabel : refNode?.text

          // Calculate label text (wrap and take first line)
          const labelText = refNodeLabel || ''
          const refNodeLines = wrapText(
            labelText,
            nodeWidth - INNER_BOX.HORIZONTAL_MARGIN - TEXT.HORIZONTAL_PADDING
          )
          const displayLine = refNodeLines[0] || ''
          const truncatedLine = displayLine === labelText ? displayLine : `${displayLine}...`

          const loopIndicatorHeight =
            INNER_BOX.INDICATOR_HEIGHT + TEXT.LINE_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP

          // Position from bottom: margin is already in nodeHeight, just position the box
          const loopIndicatorY = nodeHeight / 2 - NODE_BOX.VERTICAL_PADDING - loopIndicatorHeight

          const loopIndicator = node
            .append('g')
            .attr('transform', `translate(0, ${loopIndicatorY})`)

          loopIndicator
            .append('rect')
            .attr('class', cx('indicator-box'))
            .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN)
            .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('height', loopIndicatorHeight)

          loopIndicator
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--indicator'))
            .attr(
              'y',
              TEXT.LINE_HEIGHT / 2 + TEXT.BASELINE_OFFSET + INNER_BOX.INDICATOR_HEADER_GAP / 3
            )
            .text(`🔄 Loops back to:`)

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
        })
    }

    if (loopingPathMode === LoopingPathMode.LINK) {
      drawLoopBackLinkBadges(g, root, event)
    }

    // Center the scroll horizontally when zoomed
    if (zoomScale && scrollWrapperRef.current) {
      const wrapper = scrollWrapperRef.current
      // Center horizontally: (scrollWidth - clientWidth) / 2
      wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, zoomLevel, loopingPathMode])

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
