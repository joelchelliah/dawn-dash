import React from 'react'

import { useNavigate } from 'react-router-dom'

import GradientButton from '../../shared/components/Buttons/GradientButton'

import styles from './index.module.scss'

function NotFound(): JSX.Element {
  const navigate = useNavigate()
  const goToHome = () => navigate('/')

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404 - Page Not Found</h1>
      <p>Whoops! Nothing to see here...</p>

      <GradientButton className={styles['back-button']} onClick={goToHome}>
        Go back
      </GradientButton>
    </div>
  )
}

export default NotFound
