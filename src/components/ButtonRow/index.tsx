import { SpeedRunClass } from '../../types/speedRun'
import ClassButton from '../ClassButton'
import './index.scss'

interface ButtonRowProps {
  onClassSelect: (classType: SpeedRunClass) => void
  selectedClass: SpeedRunClass
}

function ButtonRow({ onClassSelect, selectedClass }: ButtonRowProps) {
  const classes = Object.values(SpeedRunClass)

  return (
    <div className="button-row">
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

export default ButtonRow
