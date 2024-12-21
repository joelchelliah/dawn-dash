import { useState } from 'react'

import { VIEW_MODE_LABELS } from '../../constants/chartControlValues'
import { ViewMode } from '../../types/chart'

import './index.scss'

interface ViewModeInfoProps {
  viewMode: ViewMode
}

function ViewModeInfo({ viewMode }: ViewModeInfoProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  const getTitle = () => {
    return `🔍 View mode: ${VIEW_MODE_LABELS[viewMode]}`
  }

  const getInfoText = () => {
    switch (viewMode) {
      case ViewMode.All:
        return 'Showing all available runs, including anonymous runs.'
      case ViewMode.Improvements:
        return 'Only showing runs where the player improved their personal best time.'
      case ViewMode.Records:
        return 'Only showing runs that broke the global record at the time.'
      default:
        return ''
    }
  }

  return (
    <div className="view-mode-info">
      <div className="info-text-title">{getTitle()}</div>
      <div className="info-text">{getInfoText()}</div>
      <button className="close-button" onClick={() => setIsVisible(false)}>
        ×
      </button>
    </div>
  )
}

export default ViewModeInfo
