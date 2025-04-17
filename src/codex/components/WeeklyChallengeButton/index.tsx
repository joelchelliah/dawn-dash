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
        Optimize for Weekly Challenge: <br />
        <b>{challengeName}</b>
      </>
    ),
    [challengeName]
  )
  const contentSuccess = useMemo(() => 'OPTIMIZED!', [])
  const [content, setContent] = useState<ReactNode>(contentDefault)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleClick = () => {
    if (challengeName && !isSuccess) {
      onClick()
      setIsSuccess(true)
      setTimeout(() => setIsSuccess(false), 2000)
    }
  }

  useEffect(() => {
    if (!challengeName) setContent('-')
    else if (isSuccess) setContent(contentSuccess)
    else setContent(contentDefault)
  }, [challengeName, contentDefault, contentSuccess, isSuccess])

  const buttonClassName = cx(styles['weekly-challenge-button'], {
    [styles['weekly-challenge-button--loading']]: isLoading,
  })
  const contentClassName = cx(styles['weekly-challenge-button__content'], {
    [styles['weekly-challenge-button__content--success']]: isSuccess,
  })

  return (
    <GradientButton
      onClick={handleClick}
      isLoading={isLoading}
      isAnimating={isSuccess}
      className={buttonClassName}
    >
      <div className={contentClassName}>{content}</div>
    </GradientButton>
  )
}

export default WeeklyChallengeButton
