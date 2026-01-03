import { useEffect, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree } from 'd3-hierarchy'
import Image from 'next/image'

import { createCx } from '@/shared/utils/classnames'
import { wrapText, truncateLine } from '@/shared/utils/textHelper'
import { EventArtworkImageUrl } from '@/shared/utils/imageUrls'

import { Event, EventTreeNode } from '@/codex/types/events'
import { getNodeHeight, calculateTreeBounds } from '@/codex/utils/eventTreeHelper'
import { NODE, TREE, TEXT, INNER_BOX, NODE_BOX } from '@/codex/constants/eventTreeValues'

import styles from './index.module.scss'

const cx = createCx(styles)

interface EventTreeProps {
  event: Event
}

function EventTree({ event }: EventTreeProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !event.rootNode) return

    // Clear previous visualization
    select(svgRef.current).selectAll('*').remove()

    const root = hierarchy(event.rootNode, (d) => d.children)

    const treeLayout = tree<EventTreeNode>()
      .nodeSize(NODE.DEFAULT_SIZE)
      .separation(() => {
        // Same separation for all nodes since leaf nodes rarely have siblings,
        // meaning visually adjacent leaf nodes are always non-siblings!
        return 1
        // return a.parent === b.parent ? 1 : 1
      })

    treeLayout(root)

    // Calculate bounds based on positioned nodes
    const bounds = calculateTreeBounds(root, event)

    const calculatedWidth = bounds.width + TREE.HORIZONTAL_PADDING * 2
    const svgWidth = Math.max(calculatedWidth, TREE.MIN_SVG_WIDTH)
    const svgHeight = bounds.height + TREE.VERTICAL_PADDING * 2

    // Set root.x so that it appears "visually centered" after offset is applied.
    // Looks nicer, as the root node will then be directly under the event name!
    // After translate(offsetX), root will be at: root.x + offsetX
    // We want: root.x + offsetX = svgWidth / 2
    // Therefore: root.x = svgWidth / 2 - offsetX
    const offsetX = -bounds.minX + TREE.HORIZONTAL_PADDING
    root.x = svgWidth / 2 - offsetX

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
    const offsetY = -bounds.minY + TREE.VERTICAL_PADDING

    const svg = select(svgRef.current)
      .attr('width', svgWidth)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
      .attr('preserveAspectRatio', 'xMidYMin meet')

    const g = svg.append('g').attr('transform', `translate(${offsetX}, ${offsetY})`)

    // Draw links (lines between nodes)
    g.selectAll(`.${cx('tree-link')}`)
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', cx('tree-link'))
      .attr('d', (d) => {
        const sourceY = d.source.y || 0
        const targetY = d.target.y || 0
        return `M${d.source.x},${sourceY}
                L${d.source.x},${(sourceY + targetY) / 2}
                L${d.target.x},${(sourceY + targetY) / 2}
                L${d.target.x},${targetY}`
      })

    // Draw nodes
    const nodes = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)

    // Add rectangles for nodes with dynamic heights
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
      .attr('x', -NODE.MIN_WIDTH / 2)
      .attr('y', (d) => -getNodeHeight(d.data, event) / 2)
      .attr('width', NODE.MIN_WIDTH)
      .attr('height', (d) => getNodeHeight(d.data, event))

    // Add main text content
    nodes.each(function (d) {
      const node = select(this)
      const data = d.data

      if (data.type === 'choice') {
        // For choice nodes, show the choice label
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
        const repeatableBoxHeight = data.repeatable ? INNER_BOX.INDICATOR_HEIGHT : 0

        const currentNodeHeight = getNodeHeight(data, event)
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
        const choiceText = data.choiceLabel || data.text
        const choiceLines = wrapText(choiceText, NODE.MIN_WIDTH - TEXT.HORIZONTAL_PADDING)

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
            .attr('class', cx('requirement-box'))
            .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN)
            .attr('y', 0)
            .attr('width', NODE.MIN_WIDTH - INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('height', reqBoxHeight)

          // Add "Requires:" label inside dark box
          // Calculate top padding: (box height - content height) / 2
          const contentHeight =
            TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            requirements.length * TEXT.LINE_HEIGHT
          const listingTopPadding = (reqBoxHeight - contentHeight) / 2
          reqGroup
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--requirement-header'))
            .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
            .text('Requires:')

          // Add each requirement on its own line (left-aligned)
          requirements.forEach((req, i) => {
            reqGroup
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--requirement-item'))
              .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
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
        // For end nodes, show first 2 lines of text and effects box (if present)
        const effects = data.effects || []
        const hasEffects = effects.length > 0
        const effectsBoxHeight = hasEffects
          ? TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            effects.length * TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_VERTICAL_PADDING
          : 0

        const currentNodeHeight = getNodeHeight(data, event)
        const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
        const textAreaHeight =
          currentNodeHeight - NODE_BOX.VERTICAL_PADDING * 2 - effectsBoxMargin - effectsBoxHeight
        const textAreaCenter =
          -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

        const hasText = data.text && data.text.trim().length > 0

        // Special cases for empty text:
        // - If has outcomes but no text: only show outcomes box (no text)
        // - If no outcomes and no text: show "END" in italic
        if (!hasText && hasEffects) {
          // Empty text with outcomes: skip text rendering, only show outcomes box below
        } else if (!hasText && !hasEffects) {
          // Empty text and no outcomes: show "END" in italic (like combat)
          node
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--combat'))
            .attr('x', 0)
            .attr('y', textAreaCenter + TEXT.COMBAT_BASELINE_OFFSET - TEXT.COMBAT_TEXT_HEIGHT / 2)
            .text('END')
        } else {
          const endLines = wrapText(data.text, NODE.MIN_WIDTH - TEXT.HORIZONTAL_PADDING)
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

        // Add effects box if present (at bottom of node, styled like requirements box)
        if (hasEffects) {
          const effectsGroup = node
            .append('g')
            .attr(
              'transform',
              `translate(0, ${currentNodeHeight / 2 - NODE_BOX.VERTICAL_PADDING - effectsBoxHeight})`
            )

          effectsGroup
            .append('rect')
            .attr('class', cx('requirement-box'))
            .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN)
            .attr('y', 0)
            .attr('width', NODE.MIN_WIDTH - INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('height', effectsBoxHeight)

          // Add "Outcome:" label inside dark box
          // Calculate top padding: (box height - content height) / 2
          const contentHeight =
            TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP + effects.length * TEXT.LINE_HEIGHT
          const listingTopPadding = (effectsBoxHeight - contentHeight) / 2
          effectsGroup
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--effect-header'))
            .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
            .text('Outcome:')

          // Add each effect on its own line (left-aligned)
          effects.forEach((effect, i) => {
            effectsGroup
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--effect-item'))
              .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
              .attr(
                'y',
                listingTopPadding +
                  TEXT.LINE_HEIGHT +
                  INNER_BOX.LISTINGS_HEADER_GAP +
                  (i + 1) * TEXT.LINE_HEIGHT
              )
              .text(effect)
          })
        }
      } else if (data.type === 'dialogue') {
        // For dialogue nodes, show event name for root node only, otherwise show truncated text
        const isRootNode = d.depth === 0
        const hasContinue = data.numContinues && data.numContinues > 0
        const continueBoxHeight = hasContinue ? INNER_BOX.INDICATOR_HEIGHT : 0
        const repeatableBoxHeight = data.repeatable ? INNER_BOX.INDICATOR_HEIGHT : 0

        if (isRootNode) {
          // Root node shows up to 2 lines of dialogue text (if present)
          // Event name is now displayed ABOVE the root node
          const currentNodeHeight = getNodeHeight(data, event)
          const textAreaHeight =
            currentNodeHeight -
            NODE_BOX.VERTICAL_PADDING * 2 -
            continueBoxHeight -
            repeatableBoxHeight
          const textAreaCenter =
            -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

          const hasText = data.text && data.text.trim().length > 0

          if (hasText) {
            const dialogueLines = wrapText(data.text, NODE.MIN_WIDTH - TEXT.HORIZONTAL_PADDING)
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
          const textAreaHeight =
            currentNodeHeight -
            NODE_BOX.VERTICAL_PADDING * 2 -
            continueBoxHeight -
            repeatableBoxHeight
          const textAreaCenter =
            -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

          const dialogueLines = wrapText(data.text, NODE.MIN_WIDTH - TEXT.HORIZONTAL_PADDING)
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
        // For combat nodes, show "COMBAT!" text and effects box (if present)
        const effects = data.effects || []
        const hasEffects = effects.length > 0
        const effectsBoxHeight = hasEffects
          ? TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_HEADER_GAP +
            effects.length * TEXT.LINE_HEIGHT +
            INNER_BOX.LISTINGS_VERTICAL_PADDING
          : 0
        const repeatableBoxHeight = data.repeatable ? INNER_BOX.INDICATOR_HEIGHT : 0

        const currentNodeHeight = getNodeHeight(data, event)
        const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
        // The text area is: total height minus vertical padding, effects box, its margin, and repeatable box
        const textAreaHeight =
          currentNodeHeight -
          NODE_BOX.VERTICAL_PADDING * 2 -
          effectsBoxMargin -
          effectsBoxHeight -
          repeatableBoxHeight
        // Center the text within this area, offset by top padding
        const textAreaCenter =
          -currentNodeHeight / 2 + NODE_BOX.VERTICAL_PADDING + textAreaHeight / 2

        // Add "COMBAT!" text, centered in available space
        node
          .append('text')
          .attr('class', cx('event-node-text', 'event-node-text--combat'))
          .attr('x', 0)
          .attr('y', textAreaCenter + TEXT.COMBAT_BASELINE_OFFSET - TEXT.COMBAT_TEXT_HEIGHT / 2)
          .text('COMBAT!')

        // Add effects box if present (above repeatable box, styled like requirements box)
        if (hasEffects) {
          const effectsGroup = node
            .append('g')
            .attr(
              'transform',
              `translate(0, ${currentNodeHeight / 2 - NODE_BOX.VERTICAL_PADDING - effectsBoxHeight - repeatableBoxHeight})`
            )

          effectsGroup
            .append('rect')
            .attr('class', cx('requirement-box'))
            .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN)
            .attr('y', 0)
            .attr('width', NODE.MIN_WIDTH - INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('height', effectsBoxHeight)

          // Add "Outcome:" label inside dark box
          // Calculate top padding: (box height - content height) / 2
          const contentHeight =
            TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP + effects.length * TEXT.LINE_HEIGHT
          const listingTopPadding = (effectsBoxHeight - contentHeight) / 2
          effectsGroup
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--effect-header'))
            .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
            .attr('y', listingTopPadding + TEXT.LINE_HEIGHT)
            .text('Outcome:')

          // Add each effect on its own line (left-aligned)
          effects.forEach((effect, i) => {
            effectsGroup
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--effect-item'))
              .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN * 2)
              .attr(
                'y',
                listingTopPadding +
                  TEXT.LINE_HEIGHT +
                  INNER_BOX.LISTINGS_HEADER_GAP +
                  (i + 1) * TEXT.LINE_HEIGHT
              )
              .text(effect)
          })
        }
      }
    })

    // Add `Continue` indicators
    nodes
      .filter((d) => Boolean(d.data.numContinues && d.data.numContinues > 0))
      .each(function (d) {
        const node = select(this)
        const nodeHeight = getNodeHeight(d.data, event)
        const hasRepeatable = d.data.repeatable === true
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
          .attr('class', cx('continue-box'))
          .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN)
          .attr('width', NODE.MIN_WIDTH - INNER_BOX.HORIZONTAL_MARGIN * 2)
          .attr('height', INNER_BOX.INDICATOR_HEIGHT)

        continueBox
          .append('text')
          .attr('class', cx('event-node-text', 'event-node-text--continue-badge'))
          .attr('y', INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 2)
          .text(`Continue × ${d.data.numContinues}`)
      })

    // Add `Repeatable` indicators
    nodes
      .filter((d) => d.data.repeatable === true)
      .each(function (d) {
        const node = select(this)
        const nodeHeight = getNodeHeight(d.data, event)

        // Position from bottom: margin is already in nodeHeight, just position the box
        const repeatableBoxY =
          nodeHeight / 2 - NODE_BOX.VERTICAL_PADDING - INNER_BOX.INDICATOR_HEIGHT

        const repeatableBox = node.append('g').attr('transform', `translate(0, ${repeatableBoxY})`)

        repeatableBox
          .append('rect')
          .attr('class', cx('repeatable-box'))
          .attr('x', -NODE.MIN_WIDTH / 2 + INNER_BOX.HORIZONTAL_MARGIN)
          .attr('width', NODE.MIN_WIDTH - INNER_BOX.HORIZONTAL_MARGIN * 2)
          .attr('height', INNER_BOX.INDICATOR_HEIGHT)

        repeatableBox
          .append('text')
          .attr('class', cx('event-node-text', 'event-node-text--repeatable-badge'))
          .attr('y', INNER_BOX.INDICATOR_HEIGHT / 2 + TEXT.BASELINE_OFFSET / 2)
          .text('Repeatable')
      })

    // Add title for hover tooltip
    nodes.append('title').text((d) => {
      let tooltip = `${d.data.type}: ${d.data.text}`
      if (d.data.repeatable) tooltip += '\n[REPEATABLE]'
      if (d.data.requirements) tooltip += `\nRequires: ${d.data.requirements.join(', ')}`
      if (d.data.effects) tooltip += `\nOutcome: ${d.data.effects.join(', ')}`
      return tooltip
    })
  }, [event])

  return (
    <div className={cx('event-tree-container')}>
      <div className={cx('event-header')}>
        <Image
          src={EventArtworkImageUrl(event.artwork)}
          alt={event.name}
          width={40}
          height={40}
          className={cx('event-header__artwork')}
        />
        <h3 className={cx('event-header__name')}>{event.name}</h3>
      </div>

      <svg ref={svgRef} className={cx('event-tree')} />
    </div>
  )
}

export default EventTree
