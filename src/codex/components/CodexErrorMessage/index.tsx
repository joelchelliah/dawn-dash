import styles from './index.module.scss'

type CodexErrorMessageProps = {
  isVisible: boolean
  codexType: 'card' | 'talent'
}

const CodexErrorMessage = ({ isVisible, codexType }: CodexErrorMessageProps) => {
  if (!isVisible) return null

  return (
    <div className={styles['error']}>💥 Error loading {codexType} data... Try again later!</div>
  )
}

export default CodexErrorMessage
