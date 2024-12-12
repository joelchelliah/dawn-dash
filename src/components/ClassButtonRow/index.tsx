import { SpeedRunClass } from '../../types/speedRun'
import ClassButton from '../ClassButton'
import './index.scss'

interface ClassButtonRowProps {
  onClassSelect: (classType: SpeedRunClass) => void
  selectedClass: SpeedRunClass
}

function ClassButtonRow({ onClassSelect, selectedClass }: ClassButtonRowProps) {
  const classes = Object.values(SpeedRunClass)

  return (
    <div className="class-button-row">
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

export default ClassButtonRow
