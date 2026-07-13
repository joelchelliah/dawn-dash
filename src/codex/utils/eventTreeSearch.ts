import { ChoiceNode, Event, EventTreeNode } from '@/codex/types/events'

import {
  hasChoiceLabel,
  isEffectsNode,
  isRequirementsNode,
  isTextNode,
} from './eventNodeDimensions'
import { findNodeInTree } from './tree/treeHelper'

/**
 * Searches an event tree for text that appears anywhere in:
 * - Event name
 * - Dialogue text
 * - Choice labels
 * - Requirements
 * - Effects
 * - Alias
 */
export const searchEventTree = (event: Event, searchText: string): boolean => {
  if (!searchText.trim()) return true

  const lowerSearch = searchText.toLowerCase()

  if (event.name.toLowerCase().includes(lowerSearch)) {
    return true
  }

  if (event.alias?.toLowerCase().includes(lowerSearch)) {
    return true
  }

  const matchesSearch = (node: EventTreeNode): boolean => {
    // Search text
    if (isTextNode(node) && node.text?.toLowerCase().includes(lowerSearch)) {
      return true
    }

    // Search choice label
    if (
      hasChoiceLabel(node) &&
      (node as ChoiceNode).choiceLabel?.toLowerCase().includes(lowerSearch)
    ) {
      return true
    }

    // Search requirements
    if (
      isRequirementsNode(node) &&
      node.requirements?.some((req) => req.toLowerCase().includes(lowerSearch))
    ) {
      return true
    }

    // Search effects
    return (
      isEffectsNode(node) &&
      Boolean(node.effects?.some((eff) => eff.toLowerCase().includes(lowerSearch)))
    )
  }

  return findNodeInTree(event.rootNode, (node) => node.children, matchesSearch) !== null
}
