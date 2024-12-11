import { SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { getClassImageUrl } from '../../utils/images'

import './index.scss'

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
    isActive ? ClassColorVariant.Active : ClassColorVariant.Border
  )

  return (
    <button
      className={`class-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{
        borderColor,
        boxShadow: isActive ? `0 0 6px 1px ${borderColor}40` : undefined,
      }}
    >
      <img src={imageUrl} alt={`${classType} icon`} className="class-icon" />
      <span className="class-type" style={{ color }}>
        {classType}
      </span>
    </button>
  )
}

export default ClassButton
