import { memo } from 'react'

import Image from 'next/image'
import { Chart as ChartJS } from 'chart.js'

import { createCx } from '@/shared/utils/classnames'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import { DataPoint } from '@/speedruns/types/chart'
import { SpeedRunSubclass } from '@/speedruns/types/speedRun'
import {
  anonymousBorderColor,
  anonymousMarkerColor,
  getSubclassColor,
} from '@/speedruns/utils/colors'
import { getEnergyImageUrl } from '@/speedruns/utils/images'
import {
  getPlayerBestTimes,
  isAnonymousPlayer,
  sortedDatasetsByPlayerBestTime,
} from '@/speedruns/utils/players'
import { formatTime } from '@/speedruns/utils/time'

import ClassLoadingDots from '../../ClassLoadingDots'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ChartLegendProps {
  chart: ChartJS | null
  playerColors: Record<string, string>
  selectedClass: CharacterClass
  subclass: SpeedRunSubclass | null
  isLoading: boolean
  onPlayerClick: (player: string, timestamp: number) => void
  onPlayerHover: (player: string | null) => void
}

function ChartLegend({
  chart,
  playerColors,
  onPlayerClick,
  onPlayerHover,
  selectedClass,
  subclass,
  isLoading,
}: ChartLegendProps) {
  const borderColor = getClassColor(selectedClass, ClassColorVariant.Darker)

  if (!chart?.data.datasets?.length || isLoading) {
    return (
      <div className={cx('container')} style={{ borderColor }}>
        <div className={cx('content')}>
          <ul></ul>
          {isLoading && (
            <div className={cx('loading')}>
              <ClassLoadingDots text="" selectedClass={selectedClass} />
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderIcon = (icon: string, alt: string, size = 16) => (
    <Image src={icon} alt={alt} width={size} height={size} />
  )

  const renderSubclassEnergyIcons = () => {
    if (subclass === SpeedRunSubclass.Hybrid) {
      const arcanist = getEnergyImageUrl(SpeedRunSubclass.Arcanist)
      const warrior = getEnergyImageUrl(SpeedRunSubclass.Warrior)
      const rogue = getEnergyImageUrl(SpeedRunSubclass.Rogue)

      return (
        <>
          {renderIcon(arcanist, `${subclass} icon`, 12)}
          {renderIcon(warrior, `${subclass} icon`, 12)}
          {renderIcon(rogue, `${subclass} icon`, 12)}
        </>
      )
    }

    const icon = getEnergyImageUrl(subclass ?? SpeedRunSubclass.All)

    return renderIcon(icon, `${subclass} icon`, 12)
  }

  const renderTitle = () => {
    const titleColor = getClassColor(selectedClass, ClassColorVariant.Default)
    const subtitleColor = getSubclassColor(subclass ?? SpeedRunSubclass.All, false)
    const classEnergy = getEnergyImageUrl(selectedClass)
    const subclassEnergyIcons = renderSubclassEnergyIcons()

    return (
      <div className={cx('content__title')} style={{ color: titleColor }}>
        {renderIcon(classEnergy, `${selectedClass} icon`)}
        {selectedClass}
        {renderIcon(classEnergy, `${selectedClass} icon`)}
        {subclass && (
          <div className={cx('content__title__subtitle')} style={{ color: subtitleColor }}>
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
    <div className={cx('container')} style={{ borderColor }}>
      <div className={cx('content')}>
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
            const nameContainerClassName = cx('player__name-container', {
              'special-icon-container': isFastestTime || isAnonymous,
            })
            const playerClassName = cx('player', {
              'player--fastest-time': isFastestTime,
            })
            const playerNameClassName = cx('player__name', {
              'player__name--anonymous': isAnonymous,
            })

            return (
              <li
                key={player}
                onClick={() => onPlayerClick(player, bestRun.x)}
                onMouseEnter={() => onPlayerHover(player)}
                onMouseLeave={() => onPlayerHover(null)}
              >
                <span className={cx('color-marker')} style={markerStyle} />
                <span className={playerClassName}>
                  <span className={nameContainerClassName}>
                    <span className={playerNameClassName}>
                      {isAnonymous ? 'Anonymous' : player}
                    </span>
                    {isFastestTime && (
                      <span className={cx('special-icon-container__special-icon')}>🏆</span>
                    )}
                    {isAnonymous && (
                      <span className={cx('special-icon-container__special-icon')}>❓</span>
                    )}
                  </span>
                  <span className={cx('player__time')}>{formatTime(bestTime)}</span>
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
