import { useEffect, useRef, RefObject } from 'react'

import { EventSearchPanelRef } from '../components/SearchPanels/EventSearchPanel'

interface UseEventFilterInputFocus {
  searchPanelRef: RefObject<EventSearchPanelRef>
  onEditFilter: (() => void) | undefined
}

/**
 * Custom hook to manage filter input focus behavior
 * Handles opening advanced options and focusing the filter input
 */
export function useEventFilterInputFocus(
  showAdvancedOptions: boolean,
  setShowAdvancedOptions: (show: boolean) => void,
  filterText: string
): UseEventFilterInputFocus {
  const searchPanelRef = useRef<EventSearchPanelRef>(null)

  // Focus filter input when advanced options opens
  useEffect(() => {
    if (!showAdvancedOptions) return

    // Small delay to ensure the SearchField has mounted and rendered
    const timer = setTimeout(() => {
      searchPanelRef.current?.focusFilterInput()
    }, 100)

    return () => clearTimeout(timer)
  }, [showAdvancedOptions])

  const onEditFilter =
    showAdvancedOptions || filterText.trim().length === 0
      ? undefined
      : () => {
          setShowAdvancedOptions(true)
        }

  return {
    searchPanelRef,
    onEditFilter,
  }
}
