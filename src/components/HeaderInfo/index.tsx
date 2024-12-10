import { useState } from 'react'

import GradientLink from '../../components/GradientLink'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { QuestionIcon } from '../../utils/icons'
import InfoModal from '../InfoModal'

import './index.scss'

function HeaderInfo(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isTabletOrSmaller } = useBreakpoint()
  const showOnHover = !isTabletOrSmaller

  const onIconClick = () => {
    if (isTabletOrSmaller) setIsModalOpen(true)
  }

  return (
    <div className="header-info-container">
      {showOnHover && (
        <div className="hover-text">
          <p>
            <b>Dawncaster</b> speedrun charts for all game modes and difficulties, based on
            player-submitted data from{' '}
            <GradientLink text="blightbane.io" url="https://blightbane.io/" />.
            <br />
            All the runs shown here are linked to Discord accounts, so only runs submitted via the
            official <GradientLink text="Dawncaster Discord" url="https://discord.gg/pfeMG9c" /> are
            included.
          </p>
        </div>
      )}
      <QuestionIcon className="question-icon" onClick={onIconClick} />
      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

export default HeaderInfo
