import { createCx } from '@/shared/utils/classnames'

import ScrollableWithFade from '../../ScrollableWithFade'

import styles from './index.module.scss'

const cx = createCx(styles)

export interface ModalProps {
  children: React.ReactNode
  borderColor?: string
  borderClassName?: string
  isOpen: boolean
  onClose: () => void
  maxWidth?: number
  scrollable?: boolean
  // Rendered after children, inside the (possibly scrollable) content container,
  // so it scrolls with the content rather than being pinned below it
  footer?: React.ReactNode
}

function Modal({
  children,
  borderColor,
  borderClassName,
  isOpen,
  onClose,
  maxWidth,
  scrollable,
  footer,
}: ModalProps): JSX.Element | null {
  if (!isOpen) return null

  const wrapperClassName = cx('wrapper', borderClassName, {
    'wrapper--without-class-border': !borderColor && !borderClassName,
  })

  return (
    <div className={cx('overlay')} onClick={onClose}>
      <div
        className={wrapperClassName}
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor, maxWidth }}
      >
        {scrollable ? (
          <ScrollableWithFade
            className={cx('content', 'content--scrollable')}
            scrollBottomOffset={95}
          >
            {children}
            {footer}
          </ScrollableWithFade>
        ) : (
          <div className={cx('content')}>
            {children}
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
