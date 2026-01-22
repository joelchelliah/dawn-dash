import React from 'react'

import { useRouter } from 'next/router'
import Image from 'next/image'

import { createCx } from '../src/shared/utils/classnames'
import GradientButton from '../src/shared/components/Buttons/GradientButton'
import { DantelionImageUrl } from '../src/shared/utils/imageUrls'

import styles from './404.module.scss'

const cx = createCx(styles)

export default function Custom404(): JSX.Element {
  const router = useRouter()

  const goBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className={cx('container')}>
      <h1 className={cx('title')}>404 - Whoops!</h1>
      <p>Looks like you&apos;ve wandered into the void...</p>

      <Image
        src={DantelionImageUrl}
        alt="Dantelion image"
        className={cx('image')}
        width={150}
        height={150}
      />

      <GradientButton bold className={cx('back-button')} onClick={goBack}>
        Go back
      </GradientButton>
    </div>
  )
}
