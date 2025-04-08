import React from 'react'

import { useNavigate } from 'react-router-dom'

import GradientButton from '../../shared/components/Buttons/GradientButton'

import styles from './index.module.scss'

function NotFound(): JSX.Element {
  const navigate = useNavigate()

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className={styles['container']}>
      <h1 className={styles['title']}>404 - Whoops!</h1>
      <img
        src="https://blightbane.io/images/monsters/dc_dantelion.webp"
        alt="Dantelion"
        className={styles['image']}
      />
      <p>You have trespassed into the abyss from which no soul returns!</p>

      <GradientButton className={styles['back-button']} onClick={goBack}>
        Go back
      </GradientButton>
    </div>
  )
}

export default NotFound
