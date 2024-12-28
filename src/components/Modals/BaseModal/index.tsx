import styles from './index.module.scss'

interface BaseModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

function BaseModal({ children, isOpen, onClose }: BaseModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className={styles['overlay']} onClick={onClose}>
      <div className={styles['content']} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export default BaseModal
