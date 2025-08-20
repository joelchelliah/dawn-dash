import { createCx } from '@/shared/utils/classnames'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import { useFromNow } from '@/shared/hooks/useFromNow'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'

import { SpeedRunClass } from '@/speedruns/types/speedRun'

import ClassEnergy from '../../ClassEnergy'
import ClassLoadingDots from '../../ClassLoadingDots'

import styles from './index.module.scss'

const cx = createCx(styles)

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
        <GradientButton onClick={refresh} className={cx('refresh-button')} subtle>
          Refresh
        </GradientButton>
      </>
    )
  }

  const borderColor = getClassColor(selectedClass, ClassColorVariant.Darker)
  const contentClassName = cx('content', {
    'content--loading-in-background': isLoadingInBackground,
  })
  const energyLeftClassName = cx('energy', 'energy--left', {
    'energy--loading': isLoading,
  })
  const energyRightClassName = cx('energy', 'energy--right')

  return (
    <div className={cx('container')} style={{ borderColor }}>
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
