import { createCx } from '../../../utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ModalProps {
  children: React.ReactNode
  borderColor?: string
  isOpen: boolean
  onClose: () => void
  maxWidth?: number
}

function Modal({
  children,
  borderColor,
  isOpen,
  onClose,
  maxWidth,
}: ModalProps): JSX.Element | null {
  if (!isOpen) return null

  const contentClassName = cx('content', {
    'content--without-class-border': !borderColor,
  })

  return (
    <div className={cx('overlay')} onClick={onClose}>
      <div
        className={contentClassName}
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor, maxWidth }}
      >
        {children}
      </div>
    </div>
  )
}

export default Modal
