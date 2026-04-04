import { ReactNode } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import { GameMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface IllustratedScoringInfoProps {
  mode: GameMode
  imageSrc: string
  imageAlt: string
  children: ReactNode
}

function IllustratedScoringInfo({
  mode,
  imageSrc,
  imageAlt,
  children,
}: IllustratedScoringInfoProps): JSX.Element {
  return (
    <div className={cx('illustrated-container')}>
      <div className={cx('left-column')}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={450}
          height={450}
          className={cx('illustration-image')}
        />
      </div>
      <div className={cx('right-column', `right-column--${mode}`)}>{children}</div>
    </div>
  )
}

export default IllustratedScoringInfo
