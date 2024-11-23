import React from 'react'

import { Chart as ChartJS } from 'chart.js'

import { getPlayerBestTimes, sortByPlayerBestTime } from './helper'
import './index.scss'
import { formatTime } from '../../utils/time'

interface LegendProps {
  chart: ChartJS | null
  playerColors: Record<string, string>
}

function Legend({ chart, playerColors }: LegendProps) {
  if (!chart?.data.datasets) return null

  const playerBestTimes = getPlayerBestTimes(chart)
  const sortedDatasets = sortByPlayerBestTime(chart, playerBestTimes)

  return (
    <div className="legend-container">
      <ul>
        {sortedDatasets.map((dataset) => {
          const player = dataset.label || ''
          const bestTime = playerBestTimes[player]

          return (
            <li key={player}>
              <span className="color-marker" style={{ backgroundColor: playerColors[player] }} />
              <span className="player-info">
                <span className="player-name">{player}</span>
                <span className="player-time">{formatTime(bestTime)}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Legend
