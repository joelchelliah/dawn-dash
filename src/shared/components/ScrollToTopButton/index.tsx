import { createCx } from '@/shared/utils/classnames'
import { ArrowIcon } from '@/shared/utils/icons'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ScrollToTopButtonProps {
  onClick: () => void
  show: boolean
  className?: string
}

const ScrollToTopButton = ({ onClick, show, className = '' }: ScrollToTopButtonProps) => {
  if (!show) return null

  return (
    <button
      className={cx('scroll-to-top-button', className)}
      onClick={onClick}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <ArrowIcon />
      <span>Scroll to top</span>
    </button>
  )
}

export default ScrollToTopButton
