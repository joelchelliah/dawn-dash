import { createCx } from '@/shared/utils/classnames'

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
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 4l-8 8h4v8h8v-8h4l-8-8z" />
      </svg>
    </button>
  )
}

export default ScrollToTopButton
