import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor } from '../../utils/colors'
import './index.scss'

interface ClassButtonProps {
  classType: SpeedRunClass
  isActive: boolean
  onClick: () => void
}

function getImageUrl(classType: SpeedRunClass) {
  switch (classType) {
    case SpeedRunClass.Arcanist:
      return 'https://blightbane.io/images/classes/Arcanist_I_M.webp'
    case SpeedRunClass.Hunter:
      return 'https://blightbane.io/images/classes/Hunter_I_F.webp'
    case SpeedRunClass.Knight:
      return 'https://blightbane.io/images/classes/Knight_I_M.webp'
    case SpeedRunClass.Rogue:
      return 'https://blightbane.io/images/classes/Rogue_I_F.webp'
    case SpeedRunClass.Seeker:
      return 'https://blightbane.io/images/classes/Seeker_I_M.webp'
    case SpeedRunClass.Warrior:
      return 'https://blightbane.io/images/classes/Warrior_I_M.webp'
    default:
      return 'https://blightbane.io/images/classes/Scion_I_F.webp'
  }
}

function ClassButton({ classType, isActive, onClick }: ClassButtonProps) {
  const imageUrl = getImageUrl(classType)
  const color = getClassColor(classType, isActive)

  return (
    <button className={`class-button ${isActive ? 'active' : ''}`} onClick={onClick}>
      <img src={imageUrl} alt={`${classType} icon`} className="class-icon" />
      <span className="class-type" style={{ color }}>
        {classType}
      </span>
    </button>
  )
}

export default ClassButton
