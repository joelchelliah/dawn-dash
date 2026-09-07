import Button from '@/shared/components/Buttons/Button'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import Modal, { ModalProps } from '@/shared/components/Modals/Modal'

import styles from './index.module.scss'

interface InfoModalProps extends Omit<ModalProps, 'footer'> {
  additionalText?: string
  buttonColor?: string
}

const BUTTON_TEXT = 'Okay!'

function InfoModal({ additionalText, buttonColor, children, ...modalProps }: InfoModalProps) {
  const closeButton = buttonColor ? (
    <Button
      className={`${styles['close-button']} ${styles['close-button--colored']}`}
      style={{ '--button-color': buttonColor } as React.CSSProperties}
      onClick={modalProps.onClose}
    >
      {BUTTON_TEXT}
    </Button>
  ) : (
    <GradientButton bold className={styles['close-button']} onClick={modalProps.onClose}>
      {BUTTON_TEXT}
    </GradientButton>
  )

  return (
    <Modal {...modalProps} footer={closeButton}>
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
