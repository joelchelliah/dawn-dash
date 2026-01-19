import { useEffect, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree, HierarchyPointNode } from 'd3-hierarchy'
import Image from 'next/image'

import { createCx } from '@/shared/utils/classnames'
import { wrapText, truncateLine } from '@/shared/utils/textHelper'

import { CombatNode, DialogueNode, EndNode, Event, EventTreeNode } from '@/codex/types/events'
import {
  getNodeHeight,
  getNodeWidth,
  calculateTreeBounds,
  hasEffects,
} from '@/codex/utils/eventTreeHelper'
import {
  adjustHorizontalNodeSpacing,
  adjustVerticalNodeSpacing,
} from '@/codex/utils/eventTreeSpacing'
import { NODE, TREE, TEXT, INNER_BOX, NODE_BOX } from '@/codex/constants/eventTreeValues'
import { ZoomLevel, LoopingPathMode } from '@/codex/constants/eventSearchValues'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'

import { drawLinks, drawRefChildrenLinks, drawRepeatFromLinks } from './links'
import { useEventTreeZoom } from './useEventTreeZoom'
import styles from './index.module.scss'

const cx = createCx(styles)

interface EventTreeProps {
  event: Event
  zoomLevel: ZoomLevel
  loopingPathMode: LoopingPathMode
}

function EventTree({ event, zoomLevel, loopingPathMode }: EventTreeProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollWrapperRef = useRef<HTMLDivElement>(null)

  const { eventImageSrc, onImageSrcError } = useEventImageSrc(event.artwork)
  const zoomCalculator = useEventTreeZoom()

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
    adjustVerticalNodeSpacing(root as HierarchyPointNode<EventTreeNode>, event)

    // Has given max number of children for every node in the tree
    const hasMaxChildrenOf = (maxChildren: number) =>
      root.descendants().every((node) => !node.children || node.children.length <= maxChildren)

    const bounds = calculateTreeBounds(root, event)
    const calculatedWidth = bounds.width + TREE.HORIZONTAL_PADDING * 2
    const svgWidth = Math.max(calculatedWidth, TREE.MIN_SVG_WIDTH)
    const svgHeight = bounds.height + TREE.VERTICAL_BOTTOM_PADDING

    // Calculate zoom scale
    const zoomScale = zoomCalculator.calculate({
      eventName: event.name,
      zoomLevel,
      svgWidth,
      svgHeight,
      containerWidth: scrollWrapperRef.current.clientWidth,
      containerHeight: scrollWrapperRef.current.clientHeight,
    })

    const offsetX = -bounds.minX + TREE.HORIZONTAL_PADDING

    // Center root node horizontally under the event name for simple trees.
    if (hasMaxChildrenOf(2)) {
      root.x = svgWidth / 2 - offsetX
    }

    // Center single children directly below their parent
    // When the `TREE.MIN_SVG_WIDTH` kicks in, single child nodes are not centered
    // under their parent. This fixes that! This only applies to very simple trees
    // e.g: Ambush, Bandit Den, etc.
    root.descendants().forEach((node) => {
      if (node.children && node.children.length === 1) {
        node.children[0].x = node.x ?? 0
      }
    })

    // Center the tree vertically
    const offsetY = -bounds.minY + TREE.VERTICAL_BOTTOM_PADDING / 4

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

    // Apply zoom scale to the content group
    // When scaling, we need to apply scale first, then translate by the scaled offset
    const zoomTransformScale = zoomScale ?? 1
    const g = svg
      .append('g')
      .attr('transform', `scale(${zoomTransformScale}) translate(${offsetX}, ${offsetY})`)

    drawLinks(g, defs, root, event)
    drawRefChildrenLinks(g, defs, root, event)

    // Draw repeat from links only when in 'link' mode
    if (loopingPathMode === LoopingPathMode.LINK) {
      drawRepeatFromLinks(g, defs, root, event)
    }

    // Draw nodes
    const nodes = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)

    // Draw node rectangles
    nodes
      .append('rect')
      .attr('class', (d) => {
        switch (d.data.type) {
          case 'dialogue':
            return cx('event-node', 'event-node--dialogue')
          case 'choice':
            return cx('event-node', 'event-node--choice')
          case 'combat':
            return cx('event-node', 'event-node--combat')
          case 'end':
            return cx('event-node', 'event-node--end')
          default:
            return cx('event-node', 'event-node--default')
        }
      })
      .attr('x', (d) => -getNodeWidth(d.data, event) / 2)
      .attr('y', (d) => -getNodeHeight(d.data, event) / 2)
      .attr('width', (d) => getNodeWidth(d.data, event))
      .attr('height', (d) => getNodeHeight(d.data, event))

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
        const continueBoxHeight = hasContinue ? INNER_BOX.INDICATOR_HEIGHT : 0
        const repeatableBoxHeight = data.ref ? INNER_BOX.INDICATOR_HEIGHT : 0

        const currentNodeHeight = getNodeHeight(data, event)
        const currentNodeWidth = getNodeWidth(data, event)
        const reqBoxMargin = reqBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0

        // The text area is: total height minus vertical padding, bottom boxes and their margin
        const textAreaHeight =
          currentNodeHeight -
          NODE_BOX.VERTICAL_PADDING * 2 -
          reqBoxMargin -
          reqBoxHeight -
          continueBoxHeight -
          repeatableBoxHeight

        // Center the text within this area, offset by top padding
        const textAreaCenter =
          -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

        const labelGroup = node.append('g').attr('transform', `translate(0, ${textAreaCenter})`)

        // Pre-calculate text lines
        const choiceLines = wrapText(data.choiceLabel, currentNodeWidth - TEXT.HORIZONTAL_PADDING)

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

        // Add requirements box if present (above continue box and repeatable box)
        if (hasRequirements) {
          const reqGroup = node
            .append('g')
            .attr(
              'transform',
              `translate(0, ${currentNodeHeight / 2 - NODE_BOX.VERTICAL_PADDING - reqBoxHeight - continueBoxHeight - repeatableBoxHeight})`
            )

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
        const repeatableBoxHeight = data.ref ? INNER_BOX.INDICATOR_HEIGHT : 0

        const currentNodeHeight = getNodeHeight(data, event)
        const currentNodeWidth = getNodeWidth(data, event)
        const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
        const textAreaHeight =
          currentNodeHeight -
          NODE_BOX.VERTICAL_PADDING * 2 -
          effectsBoxMargin -
          effectsBoxHeight -
          repeatableBoxHeight
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
        const continueBoxHeight = hasContinue ? INNER_BOX.INDICATOR_HEIGHT : 0
        const repeatableBoxHeight = data.ref ? INNER_BOX.INDICATOR_HEIGHT : 0
        const continueBoxMargin = continueBoxHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        const repeatableBoxMargin = repeatableBoxHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

        if (isRootNode) {
          // Root node shows up to 2 lines of dialogue text (if present)
          // Event name is now displayed ABOVE the root node
          const currentNodeHeight = getNodeHeight(data, event)
          const currentNodeWidth = getNodeWidth(data, event)
          const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
          const textAreaHeight =
            currentNodeHeight -
            NODE_BOX.VERTICAL_PADDING * 2 -
            effectsBoxMargin -
            effectsBoxHeight -
            continueBoxMargin -
            continueBoxHeight -
            repeatableBoxMargin -
            repeatableBoxHeight
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
          const currentNodeHeight = getNodeHeight(data, event)
          const currentNodeWidth = getNodeWidth(data, event)
          const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
          const textAreaHeight =
            currentNodeHeight -
            NODE_BOX.VERTICAL_PADDING * 2 -
            effectsBoxMargin -
            effectsBoxHeight -
            continueBoxMargin -
            continueBoxHeight -
            repeatableBoxMargin -
            repeatableBoxHeight
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
      } else {
        // For combat nodes, show text (up to 2 lines) or "FIGHT!" fallback (effects box is handled centrally below)
        const effects = data.effects || []
        const hasEffects = effects.length > 0
        const effectsBoxHeight = hasEffects
          ? TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            effects.length * TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_VERTICAL_PADDING
          : 0
        const repeatableBoxHeight = data.ref ? INNER_BOX.INDICATOR_HEIGHT : 0

        const currentNodeHeight = getNodeHeight(data, event)
        const currentNodeWidth = getNodeWidth(data, event)
        const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
        const repeatableBoxMargin = repeatableBoxHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        // The text area is: total height minus vertical padding, effects box, its margin, and repeatable box
        const textAreaHeight =
          currentNodeHeight -
          NODE_BOX.VERTICAL_PADDING * 2 -
          effectsBoxMargin -
          effectsBoxHeight -
          repeatableBoxMargin -
          repeatableBoxHeight
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
      }
    })

    // Add `Effect` boxes (for end, dialogue, and combat nodes that have effects)
    nodes
      .filter((d) => hasEffects(d.data))
      .each(function (d) {
        const node = select(this)
        const eventNode = d.data as DialogueNode | EndNode | CombatNode
        const effects = eventNode.effects ?? []
        const nodeHeight = getNodeHeight(eventNode, event)
        const nodeWidth = getNodeWidth(eventNode, event)

        const effectsBoxHeight =
          TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          effects.length * TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_VERTICAL_PADDING

        const continueHeight = eventNode.numContinues ? INNER_BOX.INDICATOR_HEIGHT : 0
        const continueMargin = continueHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
        const hasRepeatable = eventNode.ref
        const repeatableHeight = hasRepeatable ? INNER_BOX.INDICATOR_HEIGHT : 0
        const repeatableMargin = hasRepeatable ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

        const effectsBoxY =
          nodeHeight / 2 -
          NODE_BOX.VERTICAL_PADDING -
          effectsBoxHeight -
          continueMargin -
          continueHeight -
          repeatableMargin -
          repeatableHeight

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
        const nodeHeight = getNodeHeight(d.data, event)
        const nodeWidth = getNodeWidth(d.data, event)
        const hasRepeatable = d.data.ref
        const repeatableHeight = hasRepeatable ? INNER_BOX.INDICATOR_HEIGHT : 0
        const repeatableMargin = hasRepeatable ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

        // Position from bottom: margin is already in nodeHeight, just position the box
        const continueBoxY =
          nodeHeight / 2 -
          NODE_BOX.VERTICAL_PADDING -
          INNER_BOX.INDICATOR_HEIGHT -
          repeatableMargin -
          repeatableHeight

        const continueBox = node.append('g').attr('transform', `translate(0, ${continueBoxY})`)

        continueBox
          .append('rect')
          .attr('class', cx('indicator-box'))
          .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN)
          .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN * 2)
          .attr('height', INNER_BOX.INDICATOR_HEIGHT)

        continueBox
          .append('text')
          .attr('class', cx('event-node-text', 'event-node-text--indicator'))
          .attr('y', INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 2)
          .text(`Continue × ${d.data.numContinues}`)
      })

    // Add `Repeatable` indicators
    nodes
      .filter((d) => Boolean(d.data.ref))
      .each(function (d) {
        const node = select(this)
        const nodeHeight = getNodeHeight(d.data, event)
        const nodeWidth = getNodeWidth(d.data, event)

        // Position from bottom: margin is already in nodeHeight, just position the box
        const repeatableBoxY =
          nodeHeight / 2 - NODE_BOX.VERTICAL_PADDING - INNER_BOX.INDICATOR_HEIGHT

        const repeatableBox = node.append('g').attr('transform', `translate(0, ${repeatableBoxY})`)

        repeatableBox
          .append('rect')
          .attr('class', cx('indicator-box'))
          .attr('x', -nodeWidth / 2 + INNER_BOX.HORIZONTAL_MARGIN)
          .attr('width', nodeWidth - INNER_BOX.HORIZONTAL_MARGIN * 2)
          .attr('height', INNER_BOX.INDICATOR_HEIGHT)

        repeatableBox
          .append('text')
          .attr('class', cx('event-node-text', 'event-node-text--indicator'))
          .attr('y', INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 2)
          .text('Repeatable')
      })

    // Center the scroll horizontally when zoomed
    if (zoomScale && scrollWrapperRef.current) {
      const wrapper = scrollWrapperRef.current
      // Center horizontally: (scrollWidth - clientWidth) / 2
      wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, zoomLevel, loopingPathMode])

  return (
    <div className={cx('event-tree-container')}>
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

      <div ref={scrollWrapperRef} className={cx('event-tree-scroll-wrapper')}>
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
