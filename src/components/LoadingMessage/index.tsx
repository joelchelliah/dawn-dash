import { useDeviceOrientation } from '../../hooks/useDeviceOrientation'
import { Difficulty, SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { getClassImageUrl } from '../../utils/images'
import LoadingDots from '../LoadingDots'

import './index.scss'

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

  return (
    <div className={`loading-message ${isMobileAndPortrait ? '' : 'max-height'}`}>
      <img src={imageUrl} alt={`${selectedClass} icon`} className="loading-icon" />
      <div className="loading-text">
        Loading{' '}
        <span className="class-name" style={{ color }}>
          {classAndDifficulty}
        </span>{' '}
        <span className="last-line">
          data
          <LoadingDots selectedClass={selectedClass} />
        </span>
      </div>
    </div>
  )
}

export default LoadingMessage
