import { useCallback, useEffect, useState } from 'react'

/**
 * Dual-purpose hook for managing expandable/collapsible nodes.
 *
 * - When `showByDefault` is true, the set contains compressed nodes.
 * - When `showByDefault` is false, the set contains expanded nodes.
 */
export const useExpandableNodes = (showByDefault: boolean) => {
  const [toggledNodes, setToggledNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    setToggledNodes(new Set())
  }, [showByDefault])

  const toggleNodeExpansion = useCallback((nodeName: string) => {
    setToggledNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeName)) {
        newSet.delete(nodeName)
      } else {
        newSet.add(nodeName)
      }
      return newSet
    })
  }, [])

  const isNodeExpanded = useCallback(
    (nodeName: string) => {
      if (showByDefault) {
        return !toggledNodes.has(nodeName)
      }
      return toggledNodes.has(nodeName)
    },
    [showByDefault, toggledNodes]
  )

  return { toggleNodeExpansion, isNodeExpanded }
}
