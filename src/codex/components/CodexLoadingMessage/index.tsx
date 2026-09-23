import styles from './index.module.scss'

type CodexLoadingMessageProps = {
  isVisible: boolean
  codexType: 'card' | 'talent'
  progress: number
  isWaitingForWeeklyChallenge?: boolean
}

const CodexLoadingMessage = ({
  isVisible,
  codexType,
  progress,
  isWaitingForWeeklyChallenge = false,
}: CodexLoadingMessageProps) => {
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
      <div>⏳ Loading {codexType} data!</div>
      <div className={styles['loading__progress-container']}>
        <div className={styles['loading__progress-bar']} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles['loading__progress-text']}>{progress}% complete</div>
    </div>
  )
}

export default CodexLoadingMessage
