import Modal from '../modal'

import './index.scss'

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
        <div className="additional-text">
          <br />
          {additionalText}
        </div>
      )}
      <button onClick={onClose} className="close-button">
        Nice!
      </button>
    </Modal>
  )
}

export default InfoModal
