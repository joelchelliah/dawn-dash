import { SpeedRunClass } from '../../types/speedRun'

import ClassButton from './ClassButton'
import './index.scss'

interface ClassButtonsProps {
  onClassSelect: (classType: SpeedRunClass) => void
  selectedClass: SpeedRunClass
}

function ClassButtons({ onClassSelect, selectedClass }: ClassButtonsProps) {
  const classes = Object.values(SpeedRunClass)

  return (
    <div className="class-buttons">
      {classes.map((classType) => (
        <ClassButton
          key={classType}
          classType={classType}
          isActive={selectedClass === classType}
          onClick={() => onClassSelect(classType)}
        />
      ))}
    </div>
  )
}

export default ClassButtons
