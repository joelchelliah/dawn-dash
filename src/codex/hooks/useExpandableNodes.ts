import { useCallback, useEffect, useState } from 'react'

/**
 * Dual-purpose hook for managing expandable/collapsible node visibility state.
 *
 * - When `showByDefault` is true, the set contains hidden nodes.
 * - When `showByDefault` is false, the set contains visible nodes.
 */
export const useExpandableNodes = (showByDefault: boolean) => {
  const [toggledNodes, setToggledNodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    setToggledNodes(new Set())
  }, [showByDefault])

  const toggleNodeVisibility = useCallback((nodeName: string) => {
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

  const isNodeVisible = useCallback(
    (nodeName: string) => {
      if (showByDefault) {
        return !toggledNodes.has(nodeName)
      }
      return toggledNodes.has(nodeName)
    },
    [showByDefault, toggledNodes]
  )

  return { toggleNodeVisibility, isNodeVisible }
}
