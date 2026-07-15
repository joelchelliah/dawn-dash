import { memo } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'

import { BaseButtonProps } from '../types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface IllustratedButtonProps extends Omit<BaseButtonProps, 'children'> {
  imageUrl: string
  label?: string
  isActive: boolean
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
  className,
  disabled,
  type,
  ariaLabel,
}: IllustratedButtonProps) {
  const buttonClassName = cx('container', className, {
    'container--active': isActive,
    [`container--${classType.toLowerCase()}`]: true,
  })

  return (
    <button
      className={buttonClassName}
      onClick={onClick}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
    >
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
