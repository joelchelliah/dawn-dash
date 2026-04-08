import { createCx } from '@/shared/utils/classnames'

import ScrollableWithFade from '../../ScrollableWithFade'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ModalProps {
  children: React.ReactNode
  borderColor?: string
  isOpen: boolean
  onClose: () => void
  maxWidth?: number
  scrollable?: boolean
}

function Modal({
  children,
  borderColor,
  isOpen,
  onClose,
  maxWidth,
  scrollable,
}: ModalProps): JSX.Element | null {
  if (!isOpen) return null

  const wrapperClassName = cx('wrapper', {
    'wrapper--without-class-border': !borderColor,
  })

  return (
    <div className={cx('overlay')} onClick={onClose}>
      <div
        className={wrapperClassName}
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor, maxWidth }}
      >
        {scrollable ? (
          <ScrollableWithFade className={cx('content', 'content--scrollable')}>
            {children}
          </ScrollableWithFade>
        ) : (
          <div className={cx('content')}>{children}</div>
        )}
      </div>
    </div>
  )
}

export default Modal
