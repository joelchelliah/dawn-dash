import React from 'react'

import { useRouter } from 'next/router'

import GradientButton from '../../shared/components/Buttons/GradientButton'
import { DantelionImageUrl } from '../../shared/utils/imageUrls'

import styles from './index.module.scss'

function NotFound(): JSX.Element {
  const router = useRouter()

  const goBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className={styles['container']}>
      <h1 className={styles['title']}>404 - Whoops!</h1>
      <img src={DantelionImageUrl} alt="Dantelion" className={styles['image']} />
      <p>You have trespassed into the abyss from which no soul returns!</p>

      <GradientButton bold className={styles['back-button']} onClick={goBack}>
        Go back
      </GradientButton>
    </div>
  )
}

export default NotFound
