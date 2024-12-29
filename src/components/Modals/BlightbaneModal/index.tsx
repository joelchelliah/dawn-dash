import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import { isAnonymousPlayer } from '../../../utils/players'
import Button from '../../Buttons/Button'
import ButtonRow from '../../Buttons/ButtonRow'
import PrimaryButton from '../../Buttons/PrimaryButton'
import Modal from '../Modal'

import styles from './index.module.scss'

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
  const classColor = getClassColor(playerClass, ClassColorVariant.Light)
  const isAnonymous = isAnonymousPlayer(player)

  const renderText = () => {
    const postFix = (
      <>
        <span className={styles['player']} style={{ color: classColor }}>
          {playerClass}
        </span>{' '}
        run on Blightbane?
      </>
    )
    if (isAnonymous) {
      return (
        <p>
          Check out the best <span className={styles['anonymous']}>Anonymous</span> {postFix}
        </p>
      )
    }

    return (
      <p>
        Check out <span className={styles['player']}>{`${player}'s`}</span> best {postFix}
      </p>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={400} selectedClass={playerClass}>
      <h3 className={styles['title']}>
        <img
          src="https://blightbane.io/images/bolgar.png"
          alt="Bolgar Blightbane"
          className={styles['icon']}
        />
        Go to Blightbane?
      </h3>

      {renderText()}

      <ButtonRow>
        <Button onClick={onClose}>Nah</Button>
        <PrimaryButton selectedClass={playerClass} onClick={onConfirm}>
          Yeah!
        </PrimaryButton>
      </ButtonRow>
    </Modal>
  )
}

export default BlightbaneModal
