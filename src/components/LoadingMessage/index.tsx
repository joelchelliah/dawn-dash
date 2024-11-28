import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor } from '../../utils/colors'
import { getClassImageUrl } from '../../utils/images'

import './index.scss'

interface LoadingMessageProps {
  selectedClass: SpeedRunClass
}

function LoadingMessage({ selectedClass }: LoadingMessageProps) {
  const imageUrl = getClassImageUrl(selectedClass)
  const color = getClassColor(selectedClass, true)

  return (
    <div className="loading-message">
      <img src={imageUrl} alt={`${selectedClass} icon`} className="loading-icon" />
      <div className="loading-text">
        Loading{' '}
        <span className="class-name" style={{ color }}>
          {selectedClass}
        </span>{' '}
        data
        <span className="loading-spinner">
          <span>●</span>
          <span>●</span>
          <span>●</span>
        </span>
      </div>
    </div>
  )
}

export default LoadingMessage
