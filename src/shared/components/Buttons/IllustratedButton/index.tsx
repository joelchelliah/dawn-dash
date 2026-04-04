import { memo } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface IllustratedButtonProps {
  imageUrl: string
  label: string
  isActive: boolean
  onClick: () => void
  color: string
  borderColor: string
  hoverColor?: string
  imageAlt?: string
  imageWidth?: number
  imageHeight?: number
}

function IllustratedButton({
  imageUrl,
  label,
  isActive,
  onClick,
  color,
  hoverColor,
  borderColor,
  imageAlt,
  imageWidth = 36,
  imageHeight = 36,
}: IllustratedButtonProps) {
  const buttonClassName = cx('container', {
    'container--active': isActive,
  })

  return (
    <button
      className={buttonClassName}
      onClick={onClick}
      style={
        {
          borderColor,
          boxShadow: isActive ? `0 0 8px 1px ${borderColor}40` : undefined,
          '--hover-color': hoverColor,
        } as React.CSSProperties
      }
    >
      <Image
        src={imageUrl}
        alt={imageAlt || `${label} icon`}
        className={cx('icon')}
        width={imageWidth}
        height={imageHeight}
      />
      <span className={cx('label')} style={{ color }}>
        {label}
      </span>
    </button>
  )
}

export default memo(IllustratedButton)
