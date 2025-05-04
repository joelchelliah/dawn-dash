import cx from 'classnames'

import GradientLink from '../../../shared/components/GradientLink'
import { HourglassIcon } from '../../../shared/utils/icons'
import { useFromNow } from '../../../shared/hooks/useFromNow'

import styles from './index.module.scss'

interface CodexLastUpdatedProps {
  type: 'card' | 'talent'
  lastUpdated: number | null
  isLoading: boolean
  isLoadingInBackground: boolean
  isErrorInBackground: boolean
  progress: number
  refresh: () => void
}

const CodexLastUpdated = ({
  type,
  lastUpdated,
  isLoading,
  isLoadingInBackground,
  isErrorInBackground,
  progress,
  refresh,
}: CodexLastUpdatedProps) => {
  const fromNow = useFromNow(
    lastUpdated,
    `${type.charAt(0).toUpperCase() + type.slice(1)} data synced`
  )

  return (
    <div
      className={cx(styles['last-updated'], {
        [styles['last-updated--loading']]: isLoadingInBackground,
        [styles['last-updated--error']]: isErrorInBackground,
      })}
    >
      {isLoadingInBackground ? (
        <>
          <div className={styles['last-updated__progress-message']}>
            <HourglassIcon /> Syncing {type} data: {progress}%
          </div>
          <div className={styles['last-updated__progress-container']}>
            <div
              className={styles['last-updated__progress-bar']}
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : isErrorInBackground ? (
        <div>💥 Error syncing {type} data... Try again later!</div>
      ) : (
        fromNow
      )}
      {!(isLoading || isLoadingInBackground) && (
        <div>
          <GradientLink text="Resync data?" onClick={refresh} />
        </div>
      )}
    </div>
  )
}

export default CodexLastUpdated
