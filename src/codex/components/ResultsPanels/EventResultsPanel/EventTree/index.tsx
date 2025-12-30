import { useEffect, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree } from 'd3-hierarchy'

import { createCx } from '@/shared/utils/classnames'
import { wrapText } from '@/shared/utils/textHelper'

import { Event, EventTreeNode } from '@/codex/types/events'
import {
  calculateNodeHeight,
  calculateSvgWidth,
  calculateSvgHeight,
} from '@/codex/utils/eventTreeHelper'

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

    const nodeWidth = 200
    const minNodeHeight = 60
    const defaultHorizontalSpacing = 250 // Fixed spacing between nodes horizontally
    const defaultVerticalSpacing = 150 // Fixed spacing between depth levels
    const lineHeight = 12

    const root = hierarchy(event.rootNode, (d) => d.children)

    const getNodeHeight = (node: EventTreeNode): number => {
      return calculateNodeHeight(node, { nodeWidth, minNodeHeight, lineHeight, event })
    }

    // Use tree layout with static separation (spacing is already good)
    const treeLayout = tree<EventTreeNode>()
      .nodeSize([defaultHorizontalSpacing, defaultVerticalSpacing])
      .separation((a, b) => {
        // More spacing between non-siblings, less between siblings
        return a.parent === b.parent ? 1 : 1.25
      })

    treeLayout(root)

    const svgWidth = calculateSvgWidth(root)
    const svgHeight = calculateSvgHeight(root)

    // Calculate bounds
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    root.descendants().forEach((d) => {
      const x = d.x ?? 0
      const y = d.y ?? 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    })

    const treeWidth = maxX - minX + nodeWidth
    const treeHeight = maxY - minY + minNodeHeight

    // Center the tree horizontally and vertically
    const offsetX = -minX + nodeWidth / 2 + (svgWidth - treeWidth) / 2
    const offsetY = -minY + (svgHeight - treeHeight) / 2

    const svg = select(svgRef.current)
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)

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
      .attr('x', -nodeWidth / 2)
      .attr('y', (d) => -getNodeHeight(d.data) / 2)
      .attr('width', nodeWidth)
      .attr('height', (d) => getNodeHeight(d.data))

    // Add main text content
    nodes.each(function (d) {
      const node = select(this)
      const data = d.data

      if (data.type === 'choice') {
        // For choice nodes, show the choice label
        const requirements = data.requirements || []
        const hasRequirements = requirements.length > 0
        // Add extra height for "Requires:" label
        const reqBoxHeight = hasRequirements ? requirements.length * 12 + 20 : 0

        // Choice label group - centered in top portion of box
        const currentNodeHeight = getNodeHeight(data)
        const labelGroup = node
          .append('g')
          .attr(
            'transform',
            `translate(0, ${-currentNodeHeight / 2 + (currentNodeHeight - reqBoxHeight - 10) / 2})`
          )

        // Pre-calculate text lines
        const choiceText = data.choiceLabel || data.text
        const choiceLines = wrapText(choiceText, nodeWidth - 20, 11)
        const choiceLabelLineHeight = 12

        // Calculate vertical centering offset based on total text height
        const totalTextHeight = choiceLines.length * choiceLabelLineHeight
        const verticalCenteringOffset = -totalTextHeight / 2 + choiceLabelLineHeight / 2

        // Render each line
        choiceLines.forEach((line, i) => {
          const yPosition = i * choiceLabelLineHeight + verticalCenteringOffset

          labelGroup
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--choice-label'))
            .attr('x', 0)
            .attr('y', yPosition)
            .text(line)
        })

        // Add requirements box if present (at bottom of node)
        if (hasRequirements) {
          const reqGroup = node
            .append('g')
            .attr('transform', `translate(0, ${currentNodeHeight / 2 - reqBoxHeight - 5})`)

          reqGroup
            .append('rect')
            .attr('class', cx('requirement-box'))
            .attr('x', -nodeWidth / 2 + 5)
            .attr('y', 0)
            .attr('width', nodeWidth - 10)
            .attr('height', reqBoxHeight)

          // Add "Requires:" label inside dark box
          reqGroup
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--requirement-header'))
            .attr('x', -nodeWidth / 2 + 10)
            .attr('y', 12)
            .text('Requires:')

          // Add each requirement on its own line (left-aligned)
          const topPaddingAfterLabel = 26
          requirements.forEach((req, i) => {
            reqGroup
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--requirement-item'))
              .attr('x', -nodeWidth / 2 + 10)
              .attr('y', topPaddingAfterLabel + i * 12)
              .text(req)
          })
        }
      } else if (data.type === 'end') {
        // For end nodes, show effects
        if (data.effects && data.effects.length > 0) {
          const effects = data.effects
          const endNodeHeight = getNodeHeight(data)

          // Position effects text at top of node
          const effectsGroup = node
            .append('g')
            .attr('transform', `translate(0, ${-endNodeHeight / 2 + 10})`)

          // "Outcome:" label
          effectsGroup
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--effect-header'))
            .attr('x', -nodeWidth / 2 + 10)
            .attr('y', 8)
            .text('Outcome:')

          // Each effect on its own line (left-aligned)
          const topPaddingAfterLabel = 26
          effects.forEach((effect, i) => {
            effectsGroup
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--effect-item'))
              .attr('x', -nodeWidth / 2 + 10)
              .attr('y', topPaddingAfterLabel + i * 12)
              .text(effect)
          })
        } else {
          node
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--end-empty'))
            .attr('dy', 0)
            .text('[End]')
        }
      } else if (data.type === 'dialogue') {
        // For dialogue nodes, show event name for root node only, otherwise show truncated text
        const isRootNode = d.depth === 0
        const hasContinue = data.numContinues && data.numContinues > 0
        const yOffset = hasContinue ? -4 : 4

        if (isRootNode) {
          node
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--dialogue-main'))
            .attr('dy', yOffset)
            .text(event.name)
        } else {
          // Non-root dialogue nodes show truncated text
          const dialogueText =
            data.text.length > 44 ? data.text.substring(0, 44) + '...' : data.text
          const dialogueLines = wrapText(dialogueText, nodeWidth - 20, 10)
          const lineHeight = 12
          const yOffset = hasContinue ? -10 : -8

          dialogueLines.forEach((line, i) => {
            node
              .append('text')
              .attr('class', cx('event-node-text', 'event-node-text--dialogue-text'))
              .attr('x', 0)
              .attr('y', i * lineHeight + yOffset)
              .text(line)
          })
        }

        // Add numContinues in dark box if present
        if (hasContinue) {
          const dialogueNodeHeight = getNodeHeight(data)
          const continueBox = node
            .append('g')
            .attr('transform', `translate(0, ${dialogueNodeHeight / 2 - 22})`)

          continueBox
            .append('rect')
            .attr('class', cx('continue-box'))
            .attr('x', -nodeWidth / 2 + 5)
            .attr('y', 0)
            .attr('width', nodeWidth - 10)
            .attr('height', 18)

          continueBox
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--continue-badge'))
            .attr('dy', 12)
            .text(`Continue x ${data.numContinues}`)
        }
      } else {
        // For combat nodes, show the text
        const combatLines = wrapText(data.text, nodeWidth - 20, 11)
        const lineHeight = 12

        combatLines.forEach((line, i) => {
          node
            .append('text')
            .attr('class', cx('event-node-text', 'event-node-text--combat-text'))
            .attr('x', 0)
            .attr('y', i * lineHeight)
            .text(line)
        })
      }
    })

    // Add repeatable indicator
    nodes
      .filter((d) => d.data.repeatable === true)
      .append('circle')
      .attr('class', cx('repeatable-indicator'))
      .attr('cx', nodeWidth / 2 - 10)
      .attr('cy', (d) => -getNodeHeight(d.data) / 2 + 10)
      .attr('r', 6)

    // Add title for hover tooltip
    nodes.append('title').text((d) => {
      let tooltip = `${d.data.type}: ${d.data.text}`
      if (d.data.repeatable) tooltip += '\n[REPEATABLE]'
      if (d.data.requirements) tooltip += `\nRequirements: ${d.data.requirements.join(', ')}`
      if (d.data.effects) tooltip += `\nEffects: ${d.data.effects.join(', ')}`
      return tooltip
    })
  }, [event])

  return (
    <div className={cx('event-tree-container')}>
      <svg ref={svgRef} className={cx('event-tree')} />
    </div>
  )
}

export default EventTree
