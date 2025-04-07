import cx from 'classnames'

import GradientButton from '../../../../shared/components/Buttons/GradientButton'
import { useFromNow } from '../../../../shared/hooks/useFromNow'
import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import ClassEnergy from '../../ClassEnergy'
import ClassLoadingDots from '../../ClassLoadingDots'

import styles from './index.module.scss'

interface ChartFooterProps {
  isLoading: boolean
  isLoadingInBackground: boolean
  lastUpdated: number | null
  selectedClass: SpeedRunClass
  refresh: () => void
}

function ChartFooter({
  isLoading,
  isLoadingInBackground,
  lastUpdated,
  selectedClass,
  refresh,
}: ChartFooterProps) {
  const fromNow = useFromNow(lastUpdated, 'Data from')

  const renderContent = () => {
    if (isLoading) return <ClassLoadingDots text="" selectedClass={selectedClass} />
    if (isLoadingInBackground)
      return <ClassLoadingDots text="Loading fresh data" selectedClass={selectedClass} />
    if (!fromNow) return null

    return (
      <>
        {fromNow}
        <GradientButton onClick={refresh} className={styles['refresh-button']} subtle>
          Refresh
        </GradientButton>
      </>
    )
  }

  const borderColor = getClassColor(selectedClass, ClassColorVariant.Darker)
  const contentClassName = cx(styles['content'], {
    [styles['content--loading-in-background']]: isLoadingInBackground,
  })
  const energyLeftClassName = cx(styles['energy'], styles['energy--left'], {
    [styles['energy--loading']]: isLoading,
  })
  const energyRightClassName = cx(styles['energy'], styles['energy--right'])

  return (
    <div className={styles['container']} style={{ borderColor }}>
      <div className={energyLeftClassName}>
        <ClassEnergy classType={selectedClass} />
      </div>
      <div className={contentClassName}>{renderContent()}</div>
      <div className={energyRightClassName}>
        <ClassEnergy classType={selectedClass} />
      </div>
    </div>
  )
}

export default ChartFooter
