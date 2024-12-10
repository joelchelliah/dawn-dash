import './index.scss'

interface InfoModalProps {
  additionalText?: string
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
}

function InfoModal({
  additionalText,
  children,
  isOpen,
  onClose,
}: InfoModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
        {additionalText && <div className="additional-text">{additionalText}</div>}
        <button onClick={onClose} className="close-button">
          Nice!
        </button>
      </div>
    </div>
  )
}

export default InfoModal
