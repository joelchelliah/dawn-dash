import styles from './index.module.scss'

type CodexErrorMessageProps = {
  isVisible: boolean
}

const CodexErrorMessage = ({ isVisible }: CodexErrorMessageProps) => {
  if (!isVisible) return null

  return <div className={styles['error']}>💥 Error loading card data... Try again later!</div>
}

export default CodexErrorMessage
