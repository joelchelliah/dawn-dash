import { createCx } from '@/shared/utils/classnames'
import LoadingDots from '@/shared/components/LoadingDots'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  className?: string
  isLoading?: boolean
  type?: 'button' | 'submit'
  style?: React.CSSProperties
}

function Button({
  children,
  onClick,
  className,
  style,
  isLoading = false,
  type,
}: ButtonProps): JSX.Element {
  const buttonClassName = cx('button', className, {
    'button--loading': isLoading,
  })

  return (
    <button
      className={buttonClassName}
      onClick={onClick}
      style={style}
      disabled={isLoading}
      type={type}
    >
      {isLoading ? <LoadingDots color="#bbb" className={cx('loading-dots')} /> : children}
    </button>
  )
}

export default Button
