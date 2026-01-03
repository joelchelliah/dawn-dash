import { HierarchyNode } from 'd3-hierarchy'

import { wrapText } from '@/shared/utils/textHelper'

import { Event, EventTreeNode } from '@/codex/types/events'
import { TEXT, INNER_BOX, NODE, NODE_BOX } from '@/codex/constants/eventTreeValues'

interface TreeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

/**
 * Calculate bounding box for the entire tree based on positioned nodes
 */
export const calculateTreeBounds = (
  root: HierarchyNode<EventTreeNode>,
  event: Event
): TreeBounds => {
  let minX = Infinity // Left edge of the leftmost node
  let maxX = -Infinity // Right edge of the rightmost node
  let minY = Infinity // Top edge of the topmost node
  let maxY = -Infinity // Bottom edge of the bottommost node

  root.descendants().forEach((d) => {
    const x = d.x ?? 0
    const y = d.y ?? 0
    const nodeHeight = getNodeHeight(d.data, event)
    // Track edges for both X and Y
    if (x - NODE.MIN_WIDTH / 2 < minX) minX = x - NODE.MIN_WIDTH / 2
    if (x + NODE.MIN_WIDTH / 2 > maxX) maxX = x + NODE.MIN_WIDTH / 2
    if (y - nodeHeight / 2 < minY) minY = y - nodeHeight / 2
    if (y + nodeHeight / 2 > maxY) maxY = y + nodeHeight / 2
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Calculate dynamic node height based on event node content
 */
export const getNodeHeight = (node: EventTreeNode, event: Event): number => {
  // Check if this is the root node
  const isRootNode = event.rootNode && node.id === event.rootNode.id

  if (node.type === 'choice') {
    const requirements = node.requirements || []
    const choiceText = node.choiceLabel || node.text
    const choiceLines = wrapText(choiceText, NODE.MIN_WIDTH - TEXT.HORIZONTAL_PADDING)

    const choiceTextHeight = choiceLines.length * TEXT.CHOICE_TEXT_HEIGHT
    const reqBoxHeight =
      requirements.length > 0
        ? TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          requirements.length * TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_VERTICAL_PADDING
        : 0
    const reqBoxMargin = reqBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
    const continueBoxHeight = node.numContinues ? INNER_BOX.INDICATOR_HEIGHT : 0
    const continueBoxMargin = continueBoxHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
    const repeatableBoxHeight = node.repeatable ? INNER_BOX.INDICATOR_HEIGHT : 0
    const repeatableBoxMargin = repeatableBoxHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

    const contentHeight =
      choiceTextHeight +
      reqBoxMargin +
      reqBoxHeight +
      continueBoxMargin +
      continueBoxHeight +
      repeatableBoxMargin +
      repeatableBoxHeight

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'end') {
    // End nodes have special cases:
    // - Has text: show up to 2 lines of text + effects box (if present)
    // - No text but has effects: only show effects box (no text area)
    // - No text and no effects: show "END" (1 line)
    const hasText = node.text && node.text.trim().length > 0
    const effects = node.effects || []
    const hasEffects = effects.length > 0

    const effectsBoxHeight = hasEffects
      ? TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_HEADER_GAP +
        effects.length * TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_VERTICAL_PADDING
      : 0

    let textHeight: number
    let effectsBoxMargin: number

    if (!hasText && hasEffects) {
      // No text, only outcomes box - no margin needed
      textHeight = 0
      effectsBoxMargin = 0
    } else if (!hasText && !hasEffects) {
      // No text, no outcomes: show "END" (1 line)
      textHeight = TEXT.COMBAT_TEXT_HEIGHT
      effectsBoxMargin = 0
    } else {
      const endLines = wrapText(node.text, NODE.MIN_WIDTH - TEXT.HORIZONTAL_PADDING)
      const numLines = Math.min(endLines.length, TEXT.MAX_DISPLAY_LINES)
      textHeight = numLines * TEXT.LINE_HEIGHT
      // Only add margin if we have both text and effects box
      effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
    }

    const contentHeight = textHeight + effectsBoxMargin + effectsBoxHeight

    return Math.max(NODE.MIN_HEIGHT, contentHeight + NODE_BOX.VERTICAL_PADDING * 2)
  } else if (node.type === 'dialogue') {
    // Root node only shows event name + continue box (if present) + repeatable box (if present)
    if (isRootNode) {
      const continueHeight = node.numContinues ? INNER_BOX.INDICATOR_HEIGHT : 0
      const continueMargin = continueHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
      const repeatableHeight = node.repeatable ? INNER_BOX.INDICATOR_HEIGHT : 0
      const repeatableMargin = repeatableHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

      const contentHeight =
        TEXT.EVENT_NAME_HEIGHT +
        continueMargin +
        continueHeight +
        repeatableMargin +
        repeatableHeight

      return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
    }

    const continueHeight = node.numContinues ? INNER_BOX.INDICATOR_HEIGHT : 0
    const continueMargin = continueHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
    const repeatableHeight = node.repeatable ? INNER_BOX.INDICATOR_HEIGHT : 0
    const repeatableMargin = repeatableHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

    const dialogueLines = wrapText(node.text, NODE.MIN_WIDTH - TEXT.HORIZONTAL_PADDING)
    const numLines = Math.min(dialogueLines.length, TEXT.MAX_DISPLAY_LINES)
    const textHeight = numLines * TEXT.LINE_HEIGHT

    const contentHeight =
      textHeight + continueMargin + continueHeight + repeatableMargin + repeatableHeight

    return Math.max(NODE.MIN_HEIGHT, contentHeight + NODE_BOX.VERTICAL_PADDING * 2)
  } else if (node.type === 'combat') {
    // Combat nodes show "COMBAT!" text + effects box (if any) + repeatable box (if present)
    const textHeight = TEXT.COMBAT_TEXT_HEIGHT
    const effectsBoxHeight =
      node.effects && node.effects.length > 0
        ? TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          node.effects.length * TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_VERTICAL_PADDING
        : 0
    const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
    const repeatableHeight = node.repeatable ? INNER_BOX.INDICATOR_HEIGHT : 0
    const repeatableMargin = repeatableHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

    const contentHeight =
      textHeight + effectsBoxMargin + effectsBoxHeight + repeatableMargin + repeatableHeight

    return Math.max(NODE.MIN_HEIGHT, contentHeight + NODE_BOX.VERTICAL_PADDING * 2)
  }

  return NODE.MIN_HEIGHT
}
