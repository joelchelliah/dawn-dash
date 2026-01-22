import {
  ChoiceNode,
  CombatNode,
  DialogueNode,
  EndNode,
  Event,
  EventTreeNode,
} from '@/codex/types/events'

/**
 * Searches an event tree for text that appears anywhere in:
 * - Event name
 * - Dialogue text
 * - Choice labels
 * - Requirements
 * - Effects
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
    if (hasTextProperty(node) && node.text?.toLowerCase().includes(lowerSearch)) {
      return true
    }

    if (node.type === 'choice') {
      const choiceNode = node as ChoiceNode

      // Search choice label
      if (choiceNode.choiceLabel?.toLowerCase().includes(lowerSearch)) {
        return true
      }

      // Search requirements
      if (choiceNode.requirements?.some((req) => req.toLowerCase().includes(lowerSearch))) {
        return true
      }
    }

    // Search effects
    if (
      hasEffectsProperty(node) &&
      node.effects?.some((eff) => eff.toLowerCase().includes(lowerSearch))
    ) {
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

function hasTextProperty(node: EventTreeNode): node is DialogueNode | EndNode | CombatNode {
  return ['dialogue', 'end', 'combat'].includes(node.type)
}

function hasEffectsProperty(node: EventTreeNode): node is DialogueNode | EndNode | CombatNode {
  return ['dialogue', 'end', 'combat'].includes(node.type)
}
