import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor, ClassColorVariant } from '../../utils/colors'

import './index.scss'

interface LoadingDotsProps {
  selectedClass: SpeedRunClass
  text?: string
}

function LoadingDots({ text, selectedClass }: LoadingDotsProps) {
  const color = getClassColor(selectedClass, ClassColorVariant.Active)

  return (
    <div className="loading-dots-container">
      {text}{' '}
      <span className="loading-dots" style={{ color }}>
        <span>●</span>
        <span>●</span>
        <span>●</span>
      </span>
    </div>
  )
}

export default LoadingDots
