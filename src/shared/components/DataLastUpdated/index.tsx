import GradientLink from '@/shared/components/GradientLink'
import { HourglassIcon } from '@/shared/components/Icons'
import { useFromNow } from '@/shared/hooks/useFromNow'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface DataLastUpdatedProps {
  type: 'card' | 'talent'
  lastUpdated: number | null
  isLoading: boolean
  isLoadingInBackground: boolean
  isErrorInBackground: boolean
  progress: number
  refresh?: () => void
}

const DataLastUpdated = ({
  type,
  lastUpdated,
  isLoading,
  isLoadingInBackground,
  isErrorInBackground,
  progress,
  refresh,
}: DataLastUpdatedProps) => {
  const fromNow = useFromNow(
    lastUpdated,
    `${type.charAt(0).toUpperCase() + type.slice(1)} data synced`
  )

  return (
    <div
      className={cx('last-updated', {
        'last-updated--loading': isLoadingInBackground,
        'last-updated--error': isErrorInBackground,
      })}
    >
      {isLoadingInBackground ? (
        <>
          <div className={cx('last-updated__progress-message')}>
            <HourglassIcon /> Syncing {type} data: {progress}%
          </div>
          <div className={cx('last-updated__progress-container')}>
            <div className={cx('last-updated__progress-bar')} style={{ width: `${progress}%` }} />
          </div>
        </>
      ) : isErrorInBackground ? (
        <div>💥 Error syncing {type} data... Try again later!</div>
      ) : (
        fromNow
      )}
      {!(isLoading || isLoadingInBackground) && refresh && (
        <div>
          <GradientLink text="Resync data?" onClick={refresh} />
        </div>
      )}
    </div>
  )
}

export default DataLastUpdated
