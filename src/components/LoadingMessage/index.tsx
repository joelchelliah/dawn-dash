import cx from 'classnames'

import { useDeviceOrientation } from '../../hooks/useDeviceOrientation'
import { Difficulty, SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { getClassImageUrl } from '../../utils/images'
import LoadingDots from '../LoadingDots'

import styles from './index.module.scss'

interface LoadingMessageProps {
  selectedClass: SpeedRunClass
  selectedDifficulty: Difficulty
}

function LoadingMessage({ selectedClass, selectedDifficulty }: LoadingMessageProps) {
  const { isMobileAndPortrait } = useDeviceOrientation()

  const imageUrl = getClassImageUrl(selectedClass)
  const color = getClassColor(selectedClass, ClassColorVariant.Active)
  const classAndDifficulty =
    selectedClass === SpeedRunClass.Sunforge
      ? 'Sunforge'
      : `${selectedClass} - ${selectedDifficulty}`
  const containerClassName = cx(styles['container'], {
    [styles['container--max-height']]: !isMobileAndPortrait,
  })

  return (
    <div className={containerClassName}>
      <img src={imageUrl} alt={`${selectedClass} icon`} className={styles['loading-icon']} />
      <div className={styles['loading-text']}>
        Loading{' '}
        <span className={styles['class-name']} style={{ color }}>
          {classAndDifficulty}
        </span>{' '}
        <span className={styles['last-line']}>
          data
          <LoadingDots selectedClass={selectedClass} />
        </span>
      </div>
    </div>
  )
}

export default LoadingMessage
