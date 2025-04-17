import cx from 'classnames'

import styles from './index.module.scss'

interface LoadingDotsProps {
  color: string
  text?: string
  className?: string
}

function LoadingDots({ text, color, className }: LoadingDotsProps) {
  return (
    <div className={cx(styles['container'], className)}>
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
