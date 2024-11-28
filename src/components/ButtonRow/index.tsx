import { SpeedRunClass } from '../../types/speedRun'

import './index.scss'

interface ButtonRowProps {
  onClassSelect: (className: SpeedRunClass) => void
  selectedClass: SpeedRunClass
}

function ButtonRow({ onClassSelect, selectedClass }: ButtonRowProps) {
  const classes = Object.values(SpeedRunClass)

  return (
    <div className="button-row">
      {classes.map((className) => (
        <button
          key={className}
          className={`class-button ${selectedClass === className ? 'active' : ''}`}
          onClick={() => onClassSelect(className)}
        >
          {className}
        </button>
      ))}
    </div>
  )
}

export default ButtonRow
