import Modal from '../BaseModal'

import styles from './index.module.scss'

interface InfoModalProps {
  additionalText?: string
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

function InfoModal({ additionalText, children, isOpen, onClose }: InfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {children}
      {additionalText && (
        <div>
          <br />
          {additionalText}
        </div>
      )}
      <button onClick={onClose} className={styles['close-button']}>
        Nice!
      </button>
    </Modal>
  )
}

export default InfoModal
