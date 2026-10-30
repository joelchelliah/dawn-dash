import styles from './index.module.scss'

type DataLoadingMessageProps = {
  isVisible: boolean
  dataType: 'card' | 'talent'
  progress: number
  isWaitingForWeeklyChallenge?: boolean
}

const DataLoadingMessage = ({
  isVisible,
  dataType,
  progress,
  isWaitingForWeeklyChallenge = false,
}: DataLoadingMessageProps) => {
  if (!isVisible) return null

  if (isWaitingForWeeklyChallenge) {
    return (
      <div className={styles['loading']}>
        <div>🏆 Optimizing for this week&apos;s challenge!</div>
        <div className={styles['loading__progress-container']}>
          <div className={styles['loading__progress-bar--indeterminate']} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles['loading']}>
      <div>⏳ Loading {dataType} data!</div>
      <div className={styles['loading__progress-container']}>
        <div className={styles['loading__progress-bar']} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles['loading__progress-text']}>{progress}% complete</div>
    </div>
  )
}

export default DataLoadingMessage
