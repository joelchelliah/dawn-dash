import { useDeferredValue, useState } from 'react'

interface UseEventFilterText {
  filterText: string
  setFilterText: (text: string) => void
  deferredFilterText: string
}

/**
 * Hook for managing filter text with debouncing via React's useDeferredValue.
 *
 * - `filterText` updates immediately when the user types (for responsive UI)
 * - `deferredFilterText` updates with a slight delay (for expensive filtering operations)
 * - This prevents expensive computations on every keystroke while keeping the UI responsive
 */
export const useEventFilterText = (defaultValue?: string): UseEventFilterText => {
  const [filterText, setFilterText] = useState(defaultValue || '')
  const deferredFilterText = useDeferredValue(filterText)

  return {
    filterText,
    setFilterText,
    deferredFilterText,
  }
}
