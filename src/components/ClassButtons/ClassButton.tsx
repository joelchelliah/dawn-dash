import { memo } from 'react'

import { SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { getClassImageUrl } from '../../utils/images'

import styles from './ClassButton.module.scss'

interface ClassButtonProps {
  classType: SpeedRunClass
  isActive: boolean
  onClick: () => void
}

function ClassButton({ classType, isActive, onClick }: ClassButtonProps) {
  const imageUrl = getClassImageUrl(classType)
  const color = getClassColor(
    classType,
    isActive ? ClassColorVariant.Active : ClassColorVariant.Default
  )
  const borderColor = getClassColor(
    classType,
    isActive ? ClassColorVariant.Active : ClassColorVariant.Dark
  )

  return (
    <button
      className={`${styles.classButton} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      style={{
        borderColor,
        boxShadow: isActive ? `0 0 8px 1px ${borderColor}40` : undefined,
      }}
    >
      <img src={imageUrl} alt={`${classType} icon`} className={styles.classIcon} />
      <span className={styles.classType} style={{ color }}>
        {classType}
      </span>
    </button>
  )
}

export default memo(ClassButton)
