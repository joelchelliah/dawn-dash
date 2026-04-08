import { memo } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'

import styles from './index.module.scss'

const cx = createCx(styles)

interface IllustratedButtonProps {
  imageUrl: string
  label?: string
  isActive: boolean
  onClick: () => void
  classType: CharacterClass
  imageAlt?: string
  imageWidth?: number
  imageHeight?: number
}

function IllustratedButton({
  imageUrl,
  label,
  isActive,
  onClick,
  classType,
  imageAlt,
  imageWidth = 36,
  imageHeight = 36,
}: IllustratedButtonProps) {
  const buttonClassName = cx('container', {
    'container--active': isActive,
    [`container--${classType.toLowerCase()}`]: true,
  })

  return (
    <button className={buttonClassName} onClick={onClick}>
      <Image
        src={imageUrl}
        alt={imageAlt || `${label ?? classType} icon`}
        className={cx('icon')}
        width={imageWidth}
        height={imageHeight}
      />
      <span className={cx('label')}>{label ?? classType}</span>
    </button>
  )
}

export default memo(IllustratedButton)
