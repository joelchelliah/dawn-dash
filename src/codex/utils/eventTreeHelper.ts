import { HierarchyNode } from 'd3-hierarchy'

import { wrapText } from '@/shared/utils/textHelper'

import { Event, EventTreeNode } from '@/codex/types/events'

interface NodeHeightParams {
  nodeWidth: number
  minNodeHeight: number
  lineHeight: number
  event: Event
}

/**
 * Calculate dynamic node height based on event node content
 */
export const calculateNodeHeight = (
  node: EventTreeNode,
  { nodeWidth, minNodeHeight, lineHeight, event }: NodeHeightParams
): number => {
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

    return Math.max(minNodeHeight, totalContentHeight)
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

    return Math.max(minNodeHeight, textHeight)
  } else if (node.type === 'combat') {
    const combatLines = wrapText(node.text, nodeWidth - 20, 11)
    return Math.max(minNodeHeight, combatLines.length * lineHeight + 20)
  }

  return minNodeHeight
}

/**
 * Calculate SVG width based on max nodes at any depth level
 * Scales proportionally to ensure consistent node spacing
 *
 * Not super accurate since different nodes have different widths.
 * But it's a good approximation.
 */
export const calculateSvgWidth = (root: HierarchyNode<EventTreeNode>): number => {
  const maxNodesAtAnyDepth = calculateMaxNodesAtAnyDepth(root.descendants())
  const baseWidth = 1300
  const baseNodeCount = 4

  return Math.max(600, (maxNodesAtAnyDepth / baseNodeCount) * baseWidth)
}

/**
 * Calculate SVG height based on tree depth
 * Scales proportionally to ensure consistent vertical spacing
 *
 * Not super accurate since different nodes have different heights.
 * But it's a good approximation.
 */
export const calculateSvgHeight = (root: HierarchyNode<EventTreeNode>): number => {
  const maxDepth = root.height + 1 // +1 because root.height is 0-indexed
  const baseHeight = 575
  const baseDepthCount = 4

  return Math.max(200, (maxDepth / baseDepthCount) * baseHeight)
}

/**
 * Calculate max number of nodes at any single depth level
 * This determines how wide the tree needs to be
 */
const calculateMaxNodesAtAnyDepth = (descendants: Array<{ depth: number }>): number => {
  const nodesByDepth = new Map<number, number>()
  descendants.forEach((d) => {
    const depth = d.depth
    nodesByDepth.set(depth, (nodesByDepth.get(depth) || 0) + 1)
  })
  return Math.max(...Array.from(nodesByDepth.values()))
}
