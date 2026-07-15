import { memo } from 'react'

import { createCx } from '@/shared/utils/classnames'
import LoadingDots from '@/shared/components/LoadingDots'

import { BaseButtonProps } from '../types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ButtonProps extends BaseButtonProps {
  isLoading?: boolean
  style?: React.CSSProperties
}

function Button({
  children,
  onClick,
  className,
  style,
  isLoading = false,
  type,
  disabled,
  ariaLabel,
}: ButtonProps): JSX.Element {
  const buttonClassName = cx('button', className, {
    'button--loading': isLoading,
  })

  return (
    <button
      className={buttonClassName}
      onClick={onClick}
      style={style}
      disabled={disabled || isLoading}
      type={type}
      aria-label={ariaLabel}
    >
      {isLoading ? <LoadingDots color="#bbb" className={cx('loading-dots')} /> : children}
    </button>
  )
}

export default memo(Button)
