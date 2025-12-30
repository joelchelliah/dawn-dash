import { useEffect, useRef } from 'react'

import { select } from 'd3-selection'
import { hierarchy, tree } from 'd3-hierarchy'

import { createCx } from '@/shared/utils/classnames'
import { wrapText } from '@/shared/utils/textHelper'

import { Event, EventTreeNode } from '@/codex/types/events'

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

    // Get available width from container (max-width is 1200px in CSS)
    const containerWidth = svgRef.current.parentElement?.clientWidth || 1200
    const nodeWidth = 200
    const baseNodeHeight = 60
    const defaultHorizontalSpacing = 250
    const defaultVerticalSpacing = 150
    const padding = 40
    const lineHeight = 12

    // Create tree hierarchy
    const root = hierarchy(event.rootNode, (d) => d.children)

    // Calculate dynamic node height based on content
    const getNodeHeight = (node: EventTreeNode): number => {
      // Check if this is the root node
      const isRootNode = event.rootNode && node.id === event.rootNode.id

      if (node.type === 'choice') {
        const requirements = node.requirements || []
        const choiceText = node.choiceLabel || node.text
        const choiceLines = wrapText(choiceText, nodeWidth - 20, 11)

        // Height = choice text lines + requirements box (if any) + padding
        const choiceTextHeight = choiceLines.length * lineHeight
        const reqBoxHeight = requirements.length > 0 ? requirements.length * 12 + 20 : 0
        const padding = 14
        const totalContentHeight = choiceTextHeight + reqBoxHeight + padding

        return Math.max(baseNodeHeight, totalContentHeight)
      } else if (node.type === 'end') {
        if (node.effects && node.effects.length > 0) {
          // Height = effects box (header + effects list) + padding
          const effectsBoxHeight = node.effects.length * 12 + 20 // Header + one line per effect
          return effectsBoxHeight + 20 // Add padding
        }
      } else if (node.type === 'dialogue') {
        // Root node only shows event name + continue box (if present)
        if (isRootNode) {
          const eventNameHeight = 20 // Event name is short and bold
          const continueHeight = node.numContinues ? 25 : 0
          const padding = 10
          return eventNameHeight + continueHeight + padding
        }

        // Non-root dialogue nodes show truncated text
        const displayText = node.text.length > 50 ? node.text.substring(0, 50) + '...' : node.text
        const dialogueLines = wrapText(displayText, nodeWidth - 20, 10)
        const textHeight = dialogueLines.length * lineHeight + 20

        return Math.max(baseNodeHeight, textHeight)
      } else if (node.type === 'combat') {
        const combatLines = wrapText(node.text, nodeWidth - 20, 11)
        return Math.max(baseNodeHeight, combatLines.length * lineHeight + 20)
      }

      return baseNodeHeight
    }

    // Use tree layout with static separation (spacing is already good)
    const treeLayout = tree<EventTreeNode>()
      .nodeSize([defaultHorizontalSpacing, defaultVerticalSpacing])
      .separation((a, b) => {
        // More spacing between non-siblings, less between siblings
        return a.parent === b.parent ? 1 : 1.25
      })

    treeLayout(root)

    // Calculate initial bounds
    let minX = Infinity
    let maxX = -Infinity
    root.descendants().forEach((d) => {
      const x = d.x ?? 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
    })

    const initialTreeWidth = maxX - minX + nodeWidth
    const maxAllowedWidth = containerWidth - padding * 2

    // If tree is too wide, scale it to fit
    if (initialTreeWidth > maxAllowedWidth) {
      const scaleFactor = maxAllowedWidth / initialTreeWidth

      // Scale all x positions
      root.descendants().forEach((d) => {
        d.x = (d.x ?? 0) * scaleFactor
      })

      // Recalculate bounds after scaling
      minX = Infinity
      maxX = -Infinity
      root.descendants().forEach((d) => {
        const x = d.x ?? 0
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      })
    }

    // Calculate final bounds
    let minY = Infinity
    let maxY = -Infinity
    root.descendants().forEach((d) => {
      const y = d.y ?? 0
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    })

    const treeWidth = maxX - minX + nodeWidth
    const treeHeight = maxY - minY + baseNodeHeight * 2 // Add some buffer for variable heights

    const width = treeWidth + padding * 2
    const height = treeHeight + padding * 2

    // Center the tree horizontally, accounting for node width
    const offsetX = -minX + nodeWidth / 2 + padding

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)

    const g = svg.append('g').attr('transform', `translate(${offsetX}, ${padding})`)

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
            .attr('x', 0)
            .attr('y', yPosition)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(line)
        })

        // Add requirements box if present (at bottom of node)
        if (hasRequirements) {
          const reqGroup = node
            .append('g')
            .attr('transform', `translate(0, ${currentNodeHeight / 2 - reqBoxHeight - 5})`)

          reqGroup
            .append('rect')
            .attr('x', -nodeWidth / 2 + 5)
            .attr('y', 0)
            .attr('width', nodeWidth - 10)
            .attr('height', reqBoxHeight)
            .attr('rx', 3)
            .attr('fill', 'rgba(0, 0, 0, 0.3)')

          // Add "Requires:" label inside dark box
          reqGroup
            .append('text')
            .attr('x', -nodeWidth / 2 + 10)
            .attr('y', 12)
            .attr('text-anchor', 'start')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text('Requires:')

          // Add each requirement on its own line (left-aligned)
          const topPaddingAfterLabel = 26
          requirements.forEach((req, i) => {
            reqGroup
              .append('text')
              .attr('x', -nodeWidth / 2 + 10)
              .attr('y', topPaddingAfterLabel + i * 12)
              .attr('text-anchor', 'start')
              .attr('fill', 'white')
              .attr('font-size', '10px')
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
            .attr('x', -nodeWidth / 2 + 10)
            .attr('y', 8)
            .attr('text-anchor', 'start')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('Outcome:')

          // Each effect on its own line (left-aligned)
          const topPaddingAfterLabel = 26
          effects.forEach((effect, i) => {
            effectsGroup
              .append('text')
              .attr('x', -nodeWidth / 2 + 10)
              .attr('y', topPaddingAfterLabel + i * 12)
              .attr('text-anchor', 'start')
              .attr('fill', 'white')
              .attr('font-size', '10px')
              .text(effect)
          })
        } else {
          node
            .append('text')
            .attr('dy', 0)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-style', 'italic')
            .text('[End]')
        }
      } else if (data.type === 'dialogue') {
        // For dialogue nodes, show event name for root node only, otherwise show truncated text
        const isRootNode = d.depth === 0

        if (isRootNode) {
          node
            .append('text')
            .attr('dy', -5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text(event.name)

          // Add numContinues in dark box if present
          if (data.numContinues && data.numContinues > 0) {
            const dialogueNodeHeight = getNodeHeight(data)
            const continueBox = node
              .append('g')
              .attr('transform', `translate(0, ${dialogueNodeHeight / 2 - 22})`)

            continueBox
              .append('rect')
              .attr('x', -nodeWidth / 2 + 5)
              .attr('y', 0)
              .attr('width', nodeWidth - 10)
              .attr('height', 18)
              .attr('rx', 3)
              .attr('fill', 'rgba(0, 0, 0, 0.3)')

            continueBox
              .append('text')
              .attr('dy', 12)
              .attr('text-anchor', 'middle')
              .attr('fill', 'white')
              .attr('font-size', '9px')
              .text(`Continue x ${data.numContinues}`)
          }
        } else {
          // Non-root dialogue nodes show truncated text
          const dialogueText =
            data.text.length > 50 ? data.text.substring(0, 50) + '...' : data.text
          const dialogueLines = wrapText(dialogueText, nodeWidth - 20, 10)
          const lineHeight = 12

          dialogueLines.forEach((line, i) => {
            node
              .append('text')
              .attr('x', 0)
              .attr('y', i * lineHeight)
              .attr('text-anchor', 'middle')
              .attr('fill', 'white')
              .attr('font-size', '10px')
              .text(line)
          })
        }
      } else {
        // For combat nodes, show the text
        const combatLines = wrapText(data.text, nodeWidth - 20, 11)
        const lineHeight = 12

        combatLines.forEach((line, i) => {
          node
            .append('text')
            .attr('x', 0)
            .attr('y', i * lineHeight)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '11px')
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
      <h2 className={cx('title')}>{event.name}</h2>
      <div className={cx('svg-container')}>
        <svg ref={svgRef} className={cx('event-tree')} />
      </div>
    </div>
  )
}

export default EventTree
