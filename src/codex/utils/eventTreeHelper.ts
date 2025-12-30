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

    // Height = choice text lines + requirements box (if any) + repeatable box (if any) + padding
    const choiceTextHeight = choiceLines.length * lineHeight
    const reqBoxHeight = requirements.length > 0 ? requirements.length * lineHeight + 20 : 0
    const repeatableBoxHeight = node.repeatable ? 22 : 0
    const padding = 10
    const totalContentHeight = choiceTextHeight + reqBoxHeight + repeatableBoxHeight + padding

    return Math.max(minNodeHeight, totalContentHeight)
  } else if (node.type === 'end') {
    if (node.effects && node.effects.length > 0) {
      // Height = effects box (header + effects list) + padding
      const effectsBoxHeight = node.effects.length * 12 + 20 // Header + one line per effect
      return effectsBoxHeight + 20 // Add padding
    }
  } else if (node.type === 'dialogue') {
    // Root node only shows event name + continue box (if present) + repeatable box (if present)
    if (isRootNode) {
      const eventNameHeight = 20 // Event name is short and bold
      const continueHeight = node.numContinues ? 25 : 0
      const repeatableHeight = node.repeatable ? 22 : 0
      const padding = 10
      return eventNameHeight + continueHeight + repeatableHeight + padding
    }

    // Non-root dialogue nodes show truncated text + repeatable box (if present)
    const displayText = node.text.length > 50 ? node.text.substring(0, 50) + '...' : node.text
    const dialogueLines = wrapText(displayText, nodeWidth - 20, 10)
    const repeatableHeight = node.repeatable ? 22 : 0
    const textHeight = dialogueLines.length * lineHeight + 20 + repeatableHeight

    return Math.max(minNodeHeight, textHeight)
  } else if (node.type === 'combat') {
    const combatLines = wrapText(node.text, nodeWidth - 20, 11)
    const repeatableHeight = node.repeatable ? 22 : 0
    return Math.max(minNodeHeight, combatLines.length * lineHeight + 20 + repeatableHeight)
  }

  return minNodeHeight
}
