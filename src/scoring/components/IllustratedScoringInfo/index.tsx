import { ReactNode } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface IllustratedScoringInfoProps {
  mode: ScoringMode
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
    <div className={cx('illustrated-container', `illustrated-container--${mode}`)}>
      <div className={cx('left-column', `left-column--${mode}`)}>
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
