import { ReactNode, useEffect, useMemo, useState } from 'react'

import cx from 'classnames'

import GradientButton from '../../../shared/components/Buttons/GradientButton'

import styles from './index.module.scss'

interface WeeklyChallengeButtonProps {
  isLoading: boolean
  challengeName?: string
  onClick: () => void
}

function WeeklyChallengeButton({
  isLoading,
  challengeName,
  onClick,
}: WeeklyChallengeButtonProps): JSX.Element {
  const contentDefault = useMemo(
    () => (
      <>
        Optimize for Weekly Challenge:
        <div className={styles['weekly-challenge-button__challenge-name']}>{challengeName}</div>
      </>
    ),
    [challengeName]
  )
  const contentSuccess = useMemo(() => 'OPTIMIZED!', [])
  const [content, setContent] = useState<ReactNode>(contentDefault)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isReverting, setIsReverting] = useState(false)

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

  const buttonClassName = cx(styles['weekly-challenge-button'], {
    [styles['weekly-challenge-button--loading']]: isLoading,
    [styles['weekly-challenge-button--success']]: isSuccess,
  })
  const contentClassName = cx(styles['weekly-challenge-button__content'], {
    [styles['weekly-challenge-button__content--success']]: isSuccess,
    [styles['weekly-challenge-button__content--reverting']]: isReverting,
  })

  return (
    <GradientButton onClick={handleClick} isLoading={isLoading} className={buttonClassName}>
      <div className={contentClassName}>{content}</div>
    </GradientButton>
  )
}

export default WeeklyChallengeButton
