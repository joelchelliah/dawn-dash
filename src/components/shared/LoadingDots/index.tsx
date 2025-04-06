import styles from './index.module.scss'

interface LoadingDotsProps {
  color: string
  text?: string
}

function LoadingDots({ text, color }: LoadingDotsProps) {
  return (
    <div className={styles['container']}>
      {text}{' '}
      <span className={styles['loading-dots']} style={{ color }}>
        <span>●</span>
        <span>●</span>
        <span>●</span>
      </span>
    </div>
  )
}

export default LoadingDots
