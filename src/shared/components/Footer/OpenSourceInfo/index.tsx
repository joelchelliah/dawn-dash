import { useState } from 'react'

import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { GitHubIcon } from '@/shared/components/Icons'
import GradientLink from '@/shared/components/GradientLink'
import InfoModal from '@/shared/components/Modals/InfoModal'

import styles from './index.module.scss'

const paragraphStyle = { lineHeight: 1.8, marginBlockStart: 0, marginBlockEnd: 0 }

function getInfoText(inModal = false): JSX.Element {
  return (
    <p style={paragraphStyle}>
      {inModal && <GitHubIcon className={styles['modal-icon']} />}
      <span>This is an open source project: </span>
      {inModal && <br />}
      <GradientLink
        text="github.com/joelchelliah/dawn-dash"
        url="https://github.com/joelchelliah/dawn-dash"
      />
      {inModal && (
        <>
          <p>Feedback, ideas, and contributions are welcome!</p>
        </>
      )}
    </p>
  )
}

function OpenSourceInfo(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isDesktop, isTabletOrSmaller } = useBreakpoint()

  const onIconClick = () => {
    if (isTabletOrSmaller) setIsModalOpen(true)
  }

  return (
    <div className={styles['container']}>
      {isDesktop && <div className={styles['container__hover-text']}>{getInfoText()}</div>}

      <GitHubIcon className={styles['container__icon']} onClick={onIconClick} />

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {getInfoText(true)}
      </InfoModal>
    </div>
  )
}

export default OpenSourceInfo
