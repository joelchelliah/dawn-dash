import Image from 'next/image'
import cx from 'classnames'

import { useDeviceOrientation } from '../../../shared/hooks/useDeviceOrientation'
import { Difficulty, SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { getClassImageUrl } from '../../utils/images'
import ClassLoadingDots from '../ClassLoadingDots'

import styles from './index.module.scss'

interface ClassLoadingMessageProps {
  selectedClass: SpeedRunClass
  selectedDifficulty: Difficulty
  isVisible: boolean
}

function ClassLoadingMessage({
  isVisible,
  selectedClass,
  selectedDifficulty,
}: ClassLoadingMessageProps) {
  const { isMobileAndPortrait } = useDeviceOrientation()

  if (!isVisible) return null

  const imageUrl = getClassImageUrl(selectedClass)
  const color = getClassColor(selectedClass, ClassColorVariant.Lighter)
  const classAndDifficulty =
    selectedClass === SpeedRunClass.Sunforge
      ? 'Sunforge'
      : `${selectedClass} - ${selectedDifficulty}`
  const containerClassName = cx(styles['container'], {
    [styles['container--max-height']]: !isMobileAndPortrait,
  })

  return (
    <div className={containerClassName}>
      <Image
        src={imageUrl}
        alt={`${selectedClass} icon`}
        className={styles['loading-icon']}
        width={70}
        height={70}
      />
      <div className={styles['loading-text']}>
        Loading{' '}
        <span className={styles['class-name']} style={{ color }}>
          {classAndDifficulty}
        </span>{' '}
        <span className={styles['last-line']}>
          data
          <ClassLoadingDots selectedClass={selectedClass} />
        </span>
      </div>
    </div>
  )
}

export default ClassLoadingMessage
