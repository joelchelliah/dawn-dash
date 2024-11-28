import { Chart as ChartJS } from 'chart.js'

import { formatTime } from '../../utils/time'

import { getPlayerBestTimes, sortByPlayerBestTime } from './helper'
import './index.scss'

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
        {sortedDatasets.map((dataset, index) => {
          const player = dataset.label || ''
          const bestTime = playerBestTimes[player]
          const isFirstPlace = index === 0

          return (
            <li key={player}>
              <span className="color-marker" style={{ backgroundColor: playerColors[player] }} />
              <span className="player-info">
                <span className="player-name-container">
                  <span className={`player-name ${isFirstPlace ? 'first-place' : ''}`}>
                    {player}
                  </span>
                  {isFirstPlace && <span className="trophy">🏆</span>}
                </span>
                <span className={`player-time ${isFirstPlace ? 'first-place' : ''}`}>
                  {formatTime(bestTime)}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Legend
