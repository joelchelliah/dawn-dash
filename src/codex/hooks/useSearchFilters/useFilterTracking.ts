import { useCallback, useRef } from 'react'

// --------------------------------------------------
// ------ Tracking user interaction on filters ------
// ------ to avoid initial cache saves on load ------
// --------------------------------------------------
export const useFilterTracking = () => {
  const hasUserChangedFilter = useRef(false)

  // Every function that mutates filter state must be listed here, not just the checkbox
  // toggle: an unwrapped mutator leaves the flag false, so its change is never cached and
  // silently reverts on reload.
  const createTrackedFilter = useCallback(
    <T extends Record<string, unknown>>(untrackedFilter: T, handlerNames: (keyof T)[]): T => {
      const trackedHandlers = handlerNames.reduce((acc, handlerName) => {
        const originalHandler = untrackedFilter[handlerName] as (...args: unknown[]) => unknown
        acc[handlerName] = ((...args: unknown[]) => {
          hasUserChangedFilter.current = true
          return originalHandler(...args)
        }) as T[keyof T]
        return acc
      }, {} as Partial<T>)

      return { ...untrackedFilter, ...trackedHandlers }
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
