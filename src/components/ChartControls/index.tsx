import React from 'react'

import { ViewMode } from '../../types/chart'
import './index.scss'

interface ChartControlsProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  maxDuration: number
  setMaxDuration: (duration: number) => void
  playerLimit: number | null
  setPlayerLimit: (limit: number | null) => void
  zoomLevel: number
  setZoomLevel: (level: number) => void
}

function ChartControls({
  viewMode,
  setViewMode,
  maxDuration,
  setMaxDuration,
  playerLimit,
  setPlayerLimit,
  zoomLevel,
  setZoomLevel,
}: ChartControlsProps) {
  return (
    <div className="chart-controls">
      <div className="controls-row">
        <div className="control-group">
          <label htmlFor="playerLimit">Number of players</label>
          <select
            id="playerLimit"
            value={playerLimit || 'all'}
            onChange={(e) =>
              setPlayerLimit(e.target.value === 'all' ? null : parseInt(e.target.value))
            }
          >
            <option value="all">All</option>
            <option value="3">Top 3</option>
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="maxDuration">Max duration</label>
          <select
            id="maxDuration"
            value={maxDuration}
            onChange={(e) => setMaxDuration(parseInt(e.target.value))}
          >
            <option value="12">12 minutes</option>
            <option value="14">14 minutes</option>
            <option value="18">18 minutes</option>
            <option value="24">24 minutes</option>
            <option value="32">32 minutes</option>
            <option value="999999">All</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="viewMode">Chart type</label>
          <select
            id="viewMode"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
          >
            <option value={ViewMode.Improvements}>Self-improving runs</option>
            <option value={ViewMode.Records}>Record-breaking runs</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="zoomLevel">Zoom level</label>
          <select
            id="zoomLevel"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
          >
            <option value={100}>100%</option>
            <option value={200}>200%</option>
            <option value={300}>300%</option>
            <option value={400}>400%</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default ChartControls
