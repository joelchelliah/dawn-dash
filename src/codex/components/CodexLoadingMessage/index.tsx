import styles from './index.module.scss'

type CodexLoadingMessageProps = {
  isVisible: boolean
  codexType: 'card' | 'talent'
  progress: number
}

const CodexLoadingMessage = ({ isVisible, codexType, progress }: CodexLoadingMessageProps) => {
  if (!isVisible) return null

  return (
    <div className={styles['loading']}>
      <div>⏳ Loading {codexType} data... Please be patient!</div>
      <div className={styles['loading__progress-container']}>
        <div className={styles['loading__progress-bar']} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles['loading__progress-text']}>{progress}% complete</div>
    </div>
  )
}

export default CodexLoadingMessage
