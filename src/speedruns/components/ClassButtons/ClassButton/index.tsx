import { memo } from 'react'

import Image from 'next/image'

import { createCx } from '../../../../shared/utils/classnames'
import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import { getClassImageUrl } from '../../../utils/images'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ClassButtonProps {
  classType: SpeedRunClass
  isActive: boolean
  onClick: () => void
}

function ClassButton({ classType, isActive, onClick }: ClassButtonProps) {
  const imageUrl = getClassImageUrl(classType)
  const color = getClassColor(
    classType,
    isActive ? ClassColorVariant.Lighter : ClassColorVariant.Default
  )
  const borderColor = getClassColor(
    classType,
    isActive ? ClassColorVariant.Lighter : ClassColorVariant.Darker
  )
  const buttonClassName = cx('container', {
    'container--active': isActive,
  })

  return (
    <button
      className={buttonClassName}
      onClick={onClick}
      style={{
        borderColor,
        boxShadow: isActive ? `0 0 8px 1px ${borderColor}40` : undefined,
      }}
    >
      <Image
        src={imageUrl}
        alt={`${classType} icon`}
        className={cx('class-icon')}
        width={36}
        height={36}
      />
      <span className={cx('class-type')} style={{ color }}>
        {classType}
      </span>
    </button>
  )
}

export default memo(ClassButton)
