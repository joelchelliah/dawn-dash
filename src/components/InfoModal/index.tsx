import GradientLink from '../GradientLink'
import './index.scss'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

function InfoModal({ isOpen, onClose }: InfoModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>What is Dawn-Dash?</h3>
        <p>
          <b>Dawncaster</b> speedrun charts for all game modes and difficulties, based on
          player-submitted data from{' '}
          <GradientLink text="blightbane.io" url="https://blightbane.io/" />.
        </p>
        <p>
          All the runs shown here are linked to Discord accounts, so only runs submitted via the
          official <GradientLink text="Dawncaster Discord" url="https://discord.gg/pfeMG9c" /> are
          included.
        </p>
        <button onClick={onClose} className="close-button">
          Nice!
        </button>
      </div>
    </div>
  )
}

export default InfoModal
