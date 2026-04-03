import GradientButton from '@/shared/components/Buttons/GradientButton'
import Modal from '@/shared/components/Modals/Modal'

import styles from './index.module.scss'

interface InfoModalProps {
  additionalText?: string
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  scrollable?: boolean
}

function InfoModal({ additionalText, children, isOpen, onClose, scrollable }: InfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollable={scrollable}>
      {children}
      {additionalText && (
        <div>
          <br />
          {additionalText}
        </div>
      )}
      <GradientButton bold className={styles['close-button']} onClick={onClose}>
        Got it!
      </GradientButton>
    </Modal>
  )
}

export default InfoModal
