import { useCallback, useState } from 'react'

export const useCollapsibleNodes = () => {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())

  const collapseNode = useCallback((nodeName: string) => {
    setCollapsedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeName)) {
        newSet.delete(nodeName)
      } else {
        newSet.add(nodeName)
      }
      return newSet
    })
  }, [])

  return { collapsedNodes, collapseNode }
}
