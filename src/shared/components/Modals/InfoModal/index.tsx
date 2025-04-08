import GradientButton from '../../Buttons/GradientButton'
import Modal from '../Modal'

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
      <GradientButton className={styles['close-button']} onClick={onClose}>
        Nice!
      </GradientButton>
    </Modal>
  )
}

export default InfoModal
