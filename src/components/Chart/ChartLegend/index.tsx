import { memo } from 'react'

import { Chart as ChartJS } from 'chart.js'
import cx from 'classnames'

import { DataPoint } from '../../../types/chart'
import { SpeedRunClass, SpeedRunSubclass } from '../../../types/speedRun'
import {
  anonymousBorderColor,
  anonymousMarkerColor,
  ClassColorVariant,
  getClassColor,
  getSubclassColor,
} from '../../../utils/colors'
import { getEnergyImageUrl } from '../../../utils/images'
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
  subclass: SpeedRunSubclass | null
  isLoading: boolean
  onPlayerClick: (player: string, timestamp: number) => void
}

function ChartLegend({
  chart,
  playerColors,
  onPlayerClick,
  selectedClass,
  subclass,
  isLoading,
}: ChartLegendProps) {
  const borderColor = getClassColor(selectedClass, ClassColorVariant.Darker)

  if (!chart?.data.datasets?.length || isLoading) {
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

  const renderSubclassEnergyIcons = () => {
    if (subclass === SpeedRunSubclass.Hybrid) {
      const arcanist = getEnergyImageUrl(SpeedRunSubclass.Arcanist)
      const warrior = getEnergyImageUrl(SpeedRunSubclass.Warrior)
      const rogue = getEnergyImageUrl(SpeedRunSubclass.Rogue)

      return (
        <>
          <img src={arcanist} alt={`${subclass} icon`} />
          <img src={warrior} alt={`${subclass} icon`} />
          <img src={rogue} alt={`${subclass} icon`} />
        </>
      )
    }

    const icon = getEnergyImageUrl(subclass ?? SpeedRunSubclass.All)

    return <img src={icon} alt={`${subclass} icon`} />
  }

  const renderTitle = () => {
    const titleColor = getClassColor(selectedClass, ClassColorVariant.Default)
    const subtitleColor = getSubclassColor(subclass ?? SpeedRunSubclass.All, false)
    const classEnergy = getEnergyImageUrl(selectedClass)
    const subclassEnergyIcons = renderSubclassEnergyIcons()

    return (
      <div className={styles['content__title']} style={{ color: titleColor }}>
        <img src={classEnergy} alt={`${selectedClass} icon`} />
        {selectedClass}
        <img src={classEnergy} alt={`${selectedClass} icon`} />
        {subclass && (
          <div className={styles['content__title__subtitle']} style={{ color: subtitleColor }}>
            {subclassEnergyIcons}
            <span>{subclass}</span>
            {subclassEnergyIcons}
          </div>
        )}
      </div>
    )
  }

  const playerBestTimes = getPlayerBestTimes(chart)
  const sortedDatasets = sortedDatasetsByPlayerBestTime(chart, playerBestTimes)

  return (
    <div className={styles['container']} style={{ borderColor }}>
      <div className={styles['content']}>
        {renderTitle()}
        <ul>
          {sortedDatasets.map((dataset, index) => {
            const player = dataset.label || ''
            const isAnonymous = isAnonymousPlayer(player)
            const isFastestTime = index === 0

            const bestTime = playerBestTimes[player]
            const bestRun = (dataset.data as DataPoint[]).reduce((best, current) =>
              current.y < best.y ? current : best
            )
            const markerStyle = isAnonymous
              ? { backgroundColor: anonymousMarkerColor, borderColor: anonymousBorderColor }
              : { backgroundColor: playerColors[player] }
            const nameContainerClassName = cx(styles['player__name-container'], {
              [styles['special-icon-container']]: isFastestTime || isAnonymous,
            })
            const playerClassName = cx(styles['player'], {
              [styles['player--fastest-time']]: isFastestTime,
            })
            const playerNameClassName = cx(styles['player__name'], {
              [styles['player__name--anonymous']]: isAnonymous,
            })

            return (
              <li key={player} onClick={() => onPlayerClick(player, bestRun.x)}>
                <span className={styles['color-marker']} style={markerStyle} />
                <span className={playerClassName}>
                  <span className={nameContainerClassName}>
                    <span className={playerNameClassName}>
                      {isAnonymous ? 'Anonymous' : player}
                    </span>
                    {isFastestTime && (
                      <span className={styles['special-icon-container__special-icon']}>🏆</span>
                    )}
                    {isAnonymous && (
                      <span className={styles['special-icon-container__special-icon']}>❓</span>
                    )}
                  </span>
                  <span className={styles['player__time']}>{formatTime(bestTime)}</span>
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
