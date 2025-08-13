import { ReactNode, useEffect, useMemo, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import GradientLink from '@/shared/components/GradientLink'
import InfoModal from '@/shared/components/Modals/InfoModal'
import { QuestionIcon } from '@/shared/utils/icons'

import styles from './index.module.scss'

const cx = createCx(styles)

interface WeeklyChallengeButtonProps {
  isLoading: boolean
  challengeName?: string
  challengeId?: number
  onClick: () => void
}

function WeeklyChallengeButton({
  isLoading,
  challengeName,
  challengeId,
  onClick,
}: WeeklyChallengeButtonProps): JSX.Element {
  const contentDefault = useMemo(
    () => (
      <>
        Optimize for Weekly Challenge:
        <div className={cx('weekly-challenge-button__challenge-name')}>{challengeName}</div>
      </>
    ),
    [challengeName]
  )
  const contentSuccess = useMemo(() => 'OPTIMIZED!', [])
  const [content, setContent] = useState<ReactNode>(contentDefault)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isAnimating = isSuccess || isReverting

  const handleClick = () => {
    if (challengeName && !isAnimating) {
      onClick()
      setIsSuccess(true)
      setTimeout(() => {
        setIsReverting(true)
        setIsSuccess(false)
        setTimeout(() => setIsReverting(false), 100)
      }, 2000)
    }
  }

  useEffect(() => {
    if (!challengeName) setContent('-')
    else if (isAnimating) setContent(contentSuccess)
    else setContent(contentDefault)
  }, [challengeName, contentDefault, contentSuccess, isAnimating])

  const buttonClassName = cx('weekly-challenge-button', {
    'weekly-challenge-button--loading': isLoading,
    'weekly-challenge-button--success': isSuccess,
  })
  const contentClassName = cx('weekly-challenge-button__content', {
    'weekly-challenge-button__content--success': isSuccess,
    'weekly-challenge-button__content--reverting': isReverting,
  })

  return (
    <div className={cx('container')}>
      <GradientButton onClick={handleClick} isLoading={isLoading} className={buttonClassName}>
        <div className={contentClassName}>{content}</div>
      </GradientButton>
      {challengeName && challengeId && (
        <>
          <QuestionIcon className={cx('icon')} onClick={() => setIsModalOpen(true)} />
          <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <h3>Weekly challenge optimization</h3>

            <p>
              This will optimize the search bar and filter choices for the latest weekly challenge:{' '}
              <GradientLink
                text={challengeName}
                url={`https://blightbane.io/challenge/${challengeId}`}
              />
            </p>
            <ul>
              <li>
                Fills out all <b>keywords</b> that award extra points.
              </li>
              <li>
                Enables all <b>card sets</b> that are available for the challenge; Also taking
                malignancies into account.
              </li>
              <li>
                Enables all <b>banners</b> that are relevant for the class loadouts, malignancies,
                and starting talents.
              </li>
            </ul>
            <p>All other options are left unchanged.</p>
            <br />
          </InfoModal>
        </>
      )}
    </div>
  )
}

export default WeeklyChallengeButton
