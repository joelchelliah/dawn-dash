import { Chart as ChartJS } from 'chart.js'

import { DataPoint } from '../../types/chart'
import { formatTime } from '../../utils/time'

import { getPlayerBestTimes, sortByPlayerBestTime } from './helper'

import './index.scss'

interface ChartLegendProps {
  chart: ChartJS | null
  playerColors: Record<string, string>
  onPlayerClick: (player: string, timestamp: number) => void
}

function ChartLegend({ chart, playerColors, onPlayerClick }: ChartLegendProps) {
  if (!chart?.data.datasets) return null

  const playerBestTimes = getPlayerBestTimes(chart)
  const sortedDatasets = sortByPlayerBestTime(chart, playerBestTimes)

  return (
    <div className="legend-container">
      <div className="legend-container__content">
        <ul>
          {sortedDatasets.map((dataset, index) => {
            const player = dataset.label || ''
            const bestTime = playerBestTimes[player]
            const isFirstPlace = index === 0
            const bestRun = (dataset.data as DataPoint[]).reduce((best, current) =>
              current.y < best.y ? current : best
            )

            return (
              <li key={player} onClick={() => onPlayerClick(player, bestRun.x)}>
                <span className="color-marker" style={{ backgroundColor: playerColors[player] }} />
                <span className="player-info">
                  <span className={`player-name-container ${isFirstPlace ? 'has-trophy' : ''}`}>
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
    </div>
  )
}

export default ChartLegend
