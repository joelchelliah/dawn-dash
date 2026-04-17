import { useEffect, useState } from 'react'

import { ScoringMode, ScoringPanelId } from '../types'

export function useSelectedPanel(selectedMode: ScoringMode) {
  const [selectedPanel, setSelectedPanel] = useState<ScoringPanelId | null>(
    getDefaultPanelForMode(ScoringMode.Standard)
  )
  const [shouldScrollToPanel, setShouldScrollToPanel] = useState(false)

  const onSelectPanel = (panelId: ScoringPanelId) => {
    setSelectedPanel(panelId)
    setShouldScrollToPanel(true)
  }

  // Reset to default panel when mode changes
  useEffect(() => {
    setSelectedPanel(getDefaultPanelForMode(selectedMode))
  }, [selectedMode])

  // Scroll to panel after selectedPanel state updates and React completes rendering
  useEffect(() => {
    if (selectedPanel && shouldScrollToPanel) {
      requestAnimationFrame(() => {
        const panelElement = document.querySelector(`[data-panel-id="${selectedPanel}"]`)

        if (panelElement instanceof HTMLElement) {
          // First scroll: instant, forces browser to layout all content including off-screen panels
          panelElement.scrollIntoView({
            behavior: 'instant',
            block: 'start',
          })

          // Second scroll: smooth, now with accurate layout information
          requestAnimationFrame(() => {
            panelElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          })
        }
        setShouldScrollToPanel(false)
      })
    }
  }, [selectedPanel, shouldScrollToPanel])

  return { selectedPanel, onSelectPanel }
}

const getDefaultPanelForMode = (mode: ScoringMode): ScoringPanelId => {
  switch (mode) {
    case ScoringMode.Standard:
      return ScoringPanelId.StandardScore
    case ScoringMode.Sunforge:
      return ScoringPanelId.SunforgeScore
    case ScoringMode.WeeklyChallenge:
      return ScoringPanelId.WeeklyChallengeScore
    default:
      return ScoringPanelId.StandardScore
  }
}
