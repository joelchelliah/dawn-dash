import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor, ClassColorVariant } from '../../utils/colors'
import { getEnergyImageUrl } from '../../utils/images'

import './index.scss'

interface LoadingDotsProps {
  selectedClass: SpeedRunClass
  text?: string
  showEnergyImage?: boolean
}

function LoadingDots({ text, selectedClass, showEnergyImage = false }: LoadingDotsProps) {
  const energyImageUrl = getEnergyImageUrl(selectedClass)
  const color = getClassColor(selectedClass, ClassColorVariant.Active)

  return (
    <div className="loading-dots-container">
      {showEnergyImage && <img src={energyImageUrl} alt="Energy" className="energy-image" />}
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
