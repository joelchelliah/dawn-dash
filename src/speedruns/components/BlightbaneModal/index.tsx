import Image from 'next/image'

import Button from '../../../shared/components/Buttons/Button'
import ButtonRow from '../../../shared/components/Buttons/ButtonRow'
import { BolgarImageUrl } from '../../../shared/utils/imageUrls'
import { SpeedRunClass, SpeedRunSubclass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor, getSubclassColor } from '../../utils/colors'
import { isAnonymousPlayer } from '../../utils/players'
import PrimaryButton from '../Buttons/PrimaryButton'
import ClassModal from '../ClassModal'

import styles from './index.module.scss'

interface BlightbaneModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  player: string
  playerClass: SpeedRunClass
  subclass: SpeedRunSubclass | null
}

function BlightbaneModal({
  isOpen,
  onClose,
  onConfirm,
  player,
  playerClass,
  subclass,
}: BlightbaneModalProps) {
  const classColor = getClassColor(playerClass, ClassColorVariant.Light)
  const subclassColor = getSubclassColor(subclass ?? SpeedRunSubclass.All, true)
  const isAnonymous = isAnonymousPlayer(player)

  const renderText = () => {
    const subclassTag = subclass && subclass !== SpeedRunSubclass.All ? ` (${subclass})` : ''
    const postFix = (
      <>
        <span className={styles['player']} style={{ color: classColor }}>
          {playerClass}
          <span className={styles['subclass']} style={{ color: subclassColor }}>
            {subclassTag}
          </span>
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
    <ClassModal isOpen={isOpen} onClose={onClose} maxWidth={400} selectedClass={playerClass}>
      <h3 className={styles['title']}>
        <Image
          src={BolgarImageUrl}
          alt="Bolgar Blightbane"
          className={styles['icon']}
          width={64}
          height={44}
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
    </ClassModal>
  )
}

export default BlightbaneModal
