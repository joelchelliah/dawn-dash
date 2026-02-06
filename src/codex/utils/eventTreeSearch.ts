import { ChoiceNode, Event, EventTreeNode } from '@/codex/types/events'

import {
  hasChoiceLabel,
  isEffectsNode,
  isRequirementsNode,
  isTextNode,
} from './eventNodeDimensions'

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

  // Recursive function to search through tree nodes
  const searchNode = (node: EventTreeNode): boolean => {
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
    if (
      isEffectsNode(node) &&
      node.effects?.some((eff) => eff.toLowerCase().includes(lowerSearch))
    ) {
      return true
    }

    // Search alias
    if (event.alias?.toLowerCase().includes(lowerSearch)) {
      return true
    }

    // Recursively search children
    if (node.children && node.children.length > 0) {
      return node.children.some((child) => searchNode(child))
    }

    return false
  }

  return searchNode(event.rootNode)
}
