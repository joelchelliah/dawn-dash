import GradientButton from '@/shared/components/Buttons/GradientButton'
import Modal, { ModalProps } from '@/shared/components/Modals/Modal'

import styles from './index.module.scss'

interface InfoModalProps extends Omit<ModalProps, 'footer'> {
  additionalText?: string
}

function InfoModal({ additionalText, children, ...modalProps }: InfoModalProps) {
  return (
    <Modal
      {...modalProps}
      footer={
        <GradientButton bold className={styles['close-button']} onClick={modalProps.onClose}>
          Got it!
        </GradientButton>
      }
    >
      {children}
      {additionalText && (
        <div>
          <br />
          {additionalText}
        </div>
      )}
    </Modal>
  )
}

export default InfoModal
