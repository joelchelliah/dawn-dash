import { Difficulty, SpeedRunClass } from '../../types/speedRun'
import { getClassColor } from '../../utils/colors'
import { getClassImageUrl } from '../../utils/images'
import LoadingDots from '../LoadingDots'

import './index.scss'

interface LoadingMessageProps {
  selectedClass: SpeedRunClass
  selectedDifficulty: Difficulty
}

function LoadingMessage({ selectedClass, selectedDifficulty }: LoadingMessageProps) {
  const imageUrl = getClassImageUrl(selectedClass)
  const color = getClassColor(selectedClass, true)

  return (
    <div className="loading-message">
      <img src={imageUrl} alt={`${selectedClass} icon`} className="loading-icon" />
      <div className="loading-text">
        Loading{' '}
        <span className="class-name" style={{ color }}>
          {`${selectedClass} ${selectedDifficulty}`}
        </span>{' '}
        data
        <LoadingDots />
      </div>
    </div>
  )
}

export default LoadingMessage
