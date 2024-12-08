import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor } from '../../utils/colors'

import './index.scss'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  player: string
  playerClass: SpeedRunClass
}

function Modal({ isOpen, onClose, onConfirm, player, playerClass }: ModalProps) {
  if (!isOpen) return null

  const classColor = getClassColor(playerClass)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Go to Blightbane?</h3>
        <p>
          Check out <span className="player">{`${player}'s`}</span> best{' '}
          <span className="player" style={{ color: classColor }}>
            {playerClass}
          </span>{' '}
          run on Blightbane?
        </p>
        <div className="modal-buttons">
          <button onClick={onClose}>Nah</button>
          <button onClick={onConfirm} className="confirm">
            Yeah!
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal
