import { useState } from 'react'

import GradientLink from '../../components/GradientLink'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { QuestionIcon } from '../../utils/icons'
import InfoModal from '../Modals/InfoModal'

import styles from './index.module.scss'

function HeaderInfo(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isDesktop, isTabletOrSmaller } = useBreakpoint()

  const onIconClick = () => {
    if (isTabletOrSmaller) setIsModalOpen(true)
  }

  const infoText = (
    <>
      <p>
        <b>Dawncaster</b> speedrun charts for all game modes and difficulties, based on
        player-submitted data from{' '}
        <GradientLink text="blightbane.io" url="https://blightbane.io/" />.
      </p>
      <p>
        The player names linked to these runs are their Discord accounts from the official{' '}
        <GradientLink text="Dawncaster Discord" url="https://discord.gg/pfeMG9c" />.
      </p>
    </>
  )

  return (
    <div className={styles['container']}>
      {isDesktop && <div className={styles['container__hover-text']}>{infoText}</div>}

      <QuestionIcon className={styles['container__question-icon']} onClick={onIconClick} />

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3>What is Dawn-Dash?</h3>

        {infoText}
      </InfoModal>
    </div>
  )
}

export default HeaderInfo
