import { createCx } from '../../utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface LoadingDotsProps {
  color?: string
  text?: string
  className?: string
  dotsClassName?: string
}

function LoadingDots({ text, color = '#bbb', className, dotsClassName }: LoadingDotsProps) {
  return (
    <div className={cx('container', className)}>
      {text}{' '}
      <span className={cx('loading-dots', dotsClassName)} style={{ color }}>
        <span>●</span>
        <span>●</span>
        <span>●</span>
      </span>
    </div>
  )
}

export default LoadingDots
