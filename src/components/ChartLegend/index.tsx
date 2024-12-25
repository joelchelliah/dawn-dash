import { memo } from 'react'

import { Chart as ChartJS } from 'chart.js'

import LoadingDots from '../../components/LoadingDots'
import { DataPoint } from '../../types/chart'
import { SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { isAnonymousPlayer } from '../../utils/players'
import { formatTime } from '../../utils/time'

import { getPlayerBestTimes, sortByPlayerBestTime } from './helper'

import './index.scss'

interface ChartLegendProps {
  chart: ChartJS | null
  playerColors: Record<string, string>
  selectedClass: SpeedRunClass
  isLoading: boolean
  onPlayerClick: (player: string, timestamp: number) => void
}

function ChartLegend({
  chart,
  playerColors,
  onPlayerClick,
  selectedClass,
  isLoading,
}: ChartLegendProps) {
  const borderColor = getClassColor(selectedClass, ClassColorVariant.Dark)

  if (!chart?.data.datasets || isLoading) {
    return (
      <div className="legend-container" style={{ borderColor }}>
        <div className="legend-content">
          <ul></ul>
          {isLoading && (
            <div className="legend-loading">
              <LoadingDots text="" selectedClass={selectedClass} />
            </div>
          )}
        </div>
      </div>
    )
  }

  const playerBestTimes = getPlayerBestTimes(chart)
  const sortedDatasets = sortByPlayerBestTime(chart, playerBestTimes)

  return (
    <div className="legend-container" style={{ borderColor }}>
      <div className="legend-content">
        <ul>
          {sortedDatasets.map((dataset, index) => {
            const player = dataset.label || ''
            const isAnonymous = isAnonymousPlayer(player)

            const bestTime = playerBestTimes[player]
            const isFirstPlace = index === 0
            const bestRun = (dataset.data as DataPoint[]).reduce((best, current) =>
              current.y < best.y ? current : best
            )

            return (
              <li key={player} onClick={() => onPlayerClick(player, bestRun.x)}>
                <span className="color-marker" style={{ backgroundColor: playerColors[player] }} />
                <span className="player-info">
                  <span
                    className={`player-name-container ${
                      isFirstPlace || isAnonymous ? 'has-special-icon' : ''
                    }`}
                  >
                    <span className={`player-name ${isFirstPlace ? 'first-place' : ''}`}>
                      {isAnonymous ? <i>Anonymous</i> : player}
                    </span>
                    {isFirstPlace && <span className="special-icon">🏆</span>}
                    {isAnonymous && <span className="special-icon">❓</span>}
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

export default memo(ChartLegend)
