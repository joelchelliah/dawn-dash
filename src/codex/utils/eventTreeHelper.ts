import { HierarchyPointNode } from 'd3-hierarchy'

import { EventTreeNode } from '@/codex/types/events'

import {
  hasEffects,
  hasRequirements,
  hasContinues,
  hasText,
  hasChoiceLabel,
  isEffectsNode,
} from './eventNodeDimensions'
import { findNodeInTree } from './tree/treeHelper'

/**
 * Find a node by ID within the tree
 */
export const findNodeById = (
  root: HierarchyPointNode<EventTreeNode> | undefined,
  id: number | undefined
): EventTreeNode | undefined =>
  root
    ? findNodeInTree(
        root,
        (node) => node.children,
        (node) => node.data.id === id
      )?.data
    : undefined

/**
 * Checks if this node is drawn with an emoji on top during Compact mode.
 */
export const isEmojiBadgeNode = (node: EventTreeNode): boolean =>
  ['dialogue', 'end', 'combat', 'special', 'result'].includes(node.type)

/**
 * Checks if this node is only represented by an emoji.
 */
export const isEmojiOnlyNode = (
  node: EventTreeNode,
  isCompact: boolean,
  showContinuesTags: boolean,
  showLoopingIndicator: boolean
): boolean => {
  const isEmojiOnlyCandidate =
    isEmojiBadgeNode(node) &&
    !hasRequirements(node) &&
    !hasEffects(node) &&
    !(showContinuesTags && hasContinues(node)) &&
    !(showLoopingIndicator && node.ref !== undefined)

  return isCompact
    ? isEmojiOnlyCandidate
    : isEmojiOnlyCandidate && !hasText(node) && !hasChoiceLabel(node)
}

/**
 * Get specific emojis for custom nodes
 */
export const getCustomNodeEmoji = (node: EventTreeNode): string | undefined => {
  if (!isEffectsNode(node)) return undefined

  const effects = node.effects ?? []
  const cardGameChoices =
    'random [The Blood Moon, The Final Star, The Hangman, The Hourglass, The Pale Mask, The Wheel]'
  const ManorMusic = ['Mazurka', 'Viennese', 'Waltz']

  if (effects.includes('MERCHANT')) return '🛍️'
  if (effects.includes('BUYCARDBYCATEGORY: potion')) return '🍷'
  if (effects.includes('ENCHANTERIMBUE')) return '🎗️'
  if (effects.includes('TAKEFROMVAULT') || effects.includes('ADDTOVAULT')) return '📦'

  // Custom emoji but keep existing node type
  if (effects.includes('CARDPUZZLE')) return '🧩'
  if (effects.includes(cardGameChoices)) return '🎲'
  if (effects.some((effect) => effect.startsWith('GOTO EVENT:'))) return '📖'
  if (effects.some((effect) => ManorMusic.some((music) => effect.includes(music)))) return '💃'
  if (effects.length > 0 && effects.every((effect) => effect.match(/^GOLD: [^-]/))) return '💰'

  return undefined
}

/**
 * Should use custom node type for styling
 */
export const hasCustomNodeType = (node: EventTreeNode): boolean => {
  if (!isEffectsNode(node)) return false
  const effects = node.effects ?? []

  return (
    effects.includes('MERCHANT') ||
    effects.includes('BUYCARDBYCATEGORY: potion') ||
    effects.includes('ENCHANTERIMBUE') ||
    effects.includes('TAKEFROMVAULT') ||
    effects.includes('ADDTOVAULT')
  )
}
