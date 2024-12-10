import { useState } from 'react'

import InfoModal from '../../components/InfoModal'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { GitHubIcon } from '../../utils/icons'
import GradientLink from '../GradientLink'

import './index.scss'

const infoText = (
  <p style={{ lineHeight: 1.8 }}>
    <span>This is an open source project: </span>
    <GradientLink
      text="github.com/joelchelliah/dawn-dash"
      url="https://github.com/joelchelliah/dawn-dash"
    />
  </p>
)

function OpenSourceInfo(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isDesktop, isTabletOrSmaller } = useBreakpoint()

  const onIconClick = () => {
    if (isTabletOrSmaller) setIsModalOpen(true)
  }
  return (
    <div className="open-source-info-container">
      {isDesktop && <div className="hover-text">{infoText}</div>}

      <GitHubIcon className="github-icon" onClick={onIconClick} />

      <InfoModal
        isOpen={isModalOpen}
        additionalText={'Feedback, ideas, and contributions are welcome!'}
        onClose={() => setIsModalOpen(false)}
      >
        {infoText}
      </InfoModal>
    </div>
  )
}

export default OpenSourceInfo
