import { memo } from 'react'

import cx from 'classnames'

import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import { getClassImageUrl } from '../../../utils/images'

import styles from './index.module.scss'

interface ClassButtonProps {
  classType: SpeedRunClass
  isActive: boolean
  onClick: () => void
}

function ClassButton({ classType, isActive, onClick }: ClassButtonProps) {
  const imageUrl = getClassImageUrl(classType)
  const color = getClassColor(
    classType,
    isActive ? ClassColorVariant.Light : ClassColorVariant.Default
  )
  const borderColor = getClassColor(
    classType,
    isActive ? ClassColorVariant.Light : ClassColorVariant.Darker
  )
  const buttonClassName = cx(styles['container'], {
    [styles['container--active']]: isActive,
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
      <img src={imageUrl} alt={`${classType} icon`} className={styles['class-icon']} />
      <span className={styles['class-type']} style={{ color }}>
        {classType}
      </span>
    </button>
  )
}

export default memo(ClassButton)
