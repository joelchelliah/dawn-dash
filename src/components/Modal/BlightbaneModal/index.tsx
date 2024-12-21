import { SpeedRunClass } from '../../../types/speedRun'
import { getClassColor } from '../../../utils/colors'
import { isAnonymousPlayer } from '../../../utils/players'
import Modal from '../modal'

import './index.scss'

interface BlightbaneModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  player: string
  playerClass: SpeedRunClass
}

function BlightbaneModal({
  isOpen,
  onClose,
  onConfirm,
  player,
  playerClass,
}: BlightbaneModalProps) {
  const classColor = getClassColor(playerClass)
  const isAnonymous = isAnonymousPlayer(player)

  const renderText = () => {
    const postFix = (
      <>
        <span className="player" style={{ color: classColor }}>
          {playerClass}
        </span>{' '}
        run on Blightbane?
      </>
    )
    if (isAnonymous) {
      return (
        <p>
          Check out the best <span className="player-anonymous">Anonymous</span> {postFix}
        </p>
      )
    }

    return (
      <p>
        Check out <span className="player">{`${player}'s`}</span> best {postFix}
      </p>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h3>
        <img
          src="https://blightbane.io/images/bolgar.png"
          alt="Bolgar Blightbane"
          className="modal-icon"
        />
        Go to Blightbane?
      </h3>

      {renderText()}

      <div className="modal-buttons">
        <button onClick={onClose}>Nah</button>
        <button onClick={onConfirm} className="confirm">
          Yeah!
        </button>
      </div>
    </Modal>
  )
}

export default BlightbaneModal
