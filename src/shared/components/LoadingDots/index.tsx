import { createCx } from '../../utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface LoadingDotsProps {
  color: string
  text?: string
  className?: string
}

function LoadingDots({ text, color, className }: LoadingDotsProps) {
  return (
    <div className={cx('container', className)}>
      {text}{' '}
      <span className={cx('loading-dots')} style={{ color }}>
        <span>●</span>
        <span>●</span>
        <span>●</span>
      </span>
    </div>
  )
}

export default LoadingDots
