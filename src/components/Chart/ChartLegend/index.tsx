import { memo } from 'react'

import { Chart as ChartJS } from 'chart.js'
import cx from 'classnames'

import { DataPoint } from '../../../types/chart'
import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import {
  getPlayerBestTimes,
  isAnonymousPlayer,
  sortedDatasetsByPlayerBestTime,
} from '../../../utils/players'
import { formatTime } from '../../../utils/time'
import LoadingDots from '../../LoadingDots'

import styles from './index.module.scss'

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
      <div className={styles['container']} style={{ borderColor }}>
        <div className={styles['content']}>
          <ul></ul>
          {isLoading && (
            <div className={styles['loading']}>
              <LoadingDots text="" selectedClass={selectedClass} />
            </div>
          )}
        </div>
      </div>
    )
  }

  const playerBestTimes = getPlayerBestTimes(chart)
  const sortedDatasets = sortedDatasetsByPlayerBestTime(chart, playerBestTimes)

  return (
    <div className={styles['container']} style={{ borderColor }}>
      <div className={styles['content']}>
        <ul>
          {sortedDatasets.map((dataset, index) => {
            const player = dataset.label || ''
            const isAnonymous = isAnonymousPlayer(player)
            const isFastestTime = index === 0

            const bestTime = playerBestTimes[player]
            const bestRun = (dataset.data as DataPoint[]).reduce((best, current) =>
              current.y < best.y ? current : best
            )
            const nameContainerClassName = cx(styles['name-container'], {
              [styles['special-icon-container']]: isFastestTime || isAnonymous,
            })
            const nameClassName = cx(styles['name'], {
              [styles['fastest-time']]: isFastestTime,
            })
            const timeClassName = cx(styles['time'], {
              [styles['fastest-time']]: isFastestTime,
            })

            return (
              <li key={player} onClick={() => onPlayerClick(player, bestRun.x)}>
                <span
                  className={styles['color-marker']}
                  style={{ backgroundColor: playerColors[player] }}
                />
                <span className={styles['player']}>
                  <span className={nameContainerClassName}>
                    <span className={nameClassName}>{isAnonymous ? <i>Anonymous</i> : player}</span>
                    {isFastestTime && (
                      <span className={styles['special-icon-container__special-icon']}>🏆</span>
                    )}
                    {isAnonymous && (
                      <span className={styles['special-icon-container__special-icon']}>❓</span>
                    )}
                  </span>
                  <span className={timeClassName}>{formatTime(bestTime)}</span>
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
