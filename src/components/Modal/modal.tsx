import './modal.scss'

interface ModalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

function Modal({ children, isOpen, onClose }: ModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export default Modal
