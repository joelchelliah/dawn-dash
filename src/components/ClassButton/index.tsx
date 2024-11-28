import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor } from '../../utils/colors'
import { getClassImageUrl } from '../../utils/images'

import './index.scss'

interface ClassButtonProps {
  classType: SpeedRunClass
  isActive: boolean
  onClick: () => void
}

function ClassButton({ classType, isActive, onClick }: ClassButtonProps) {
  const imageUrl = getClassImageUrl(classType)
  const color = getClassColor(classType, isActive)
  const name = classType === SpeedRunClass.Scion ? 'Sunforge' : classType

  return (
    <button className={`class-button ${isActive ? 'active' : ''}`} onClick={onClick}>
      <img src={imageUrl} alt={`${classType} icon`} className="class-icon" />
      <span className="class-type" style={{ color }}>
        {name}
      </span>
    </button>
  )
}

export default ClassButton
