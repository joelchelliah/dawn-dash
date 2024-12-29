import cx from 'classnames'

import { SpeedRunClass } from '../../../types/speedRun'
import { getClassColor, ClassColorVariant } from '../../../utils/colors'

import styles from './index.module.scss'

interface ModalProps {
  children: React.ReactNode
  selectedClass?: SpeedRunClass
  isOpen: boolean
  onClose: () => void
  maxWidth?: number
}

function Modal({
  children,
  selectedClass,
  isOpen,
  onClose,
  maxWidth,
}: ModalProps): JSX.Element | null {
  if (!isOpen) return null

  const borderColor = selectedClass
    ? getClassColor(selectedClass, ClassColorVariant.Dark)
    : undefined

  const contentClassName = cx(styles['content'], {
    [styles['content--without-class-border']]: !borderColor,
  })

  return (
    <div className={styles['overlay']} onClick={onClose}>
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
