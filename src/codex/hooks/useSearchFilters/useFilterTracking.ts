import { useCallback, useRef } from 'react'

// --------------------------------------------------
// ------ Tracking user interaction on filters ------
// ------ to avoid initial cache saves on load ------
// --------------------------------------------------
export const useFilterTracking = () => {
  const hasUserChangedFilter = useRef(false)

  const createTrackedFilter = useCallback(
    <T extends Record<string, unknown>>(untrackedFilter: T, handlerName: keyof T): T => {
      const originalHandler = untrackedFilter[handlerName] as (...args: unknown[]) => unknown
      return {
        ...untrackedFilter,
        [handlerName]: (...args: unknown[]) => {
          hasUserChangedFilter.current = true
          return originalHandler(...args)
        },
      }
    },
    []
  )

  const createTrackedSetter = useCallback(<T>(originalSetter: (value: T) => void) => {
    return (value: T) => {
      hasUserChangedFilter.current = true
      originalSetter(value)
    }
  }, [])

  return {
    hasUserChangedFilter,
    createTrackedFilter,
    createTrackedSetter,
  }
}
