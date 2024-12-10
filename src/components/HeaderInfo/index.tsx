import { useState } from 'react'

import GradientLink from '../../components/GradientLink'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { QuestionIcon } from '../../utils/icons'
import InfoModal from '../Modal/InfoModal'

import './index.scss'

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
        All the runs shown here are linked to Discord accounts, so only runs submitted via the
        official <GradientLink text="Dawncaster Discord" url="https://discord.gg/pfeMG9c" /> are
        included.
      </p>
    </>
  )

  return (
    <div className="header-info-container">
      {isDesktop && <div className="hover-text">{infoText}</div>}

      <QuestionIcon className="question-icon" onClick={onIconClick} />

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3>What is Dawn-Dash?</h3>

        {infoText}
      </InfoModal>
    </div>
  )
}

export default HeaderInfo
