import { memo } from 'react'

import { SpeedRunClass } from '../../types/speedRun'

import ClassButton from './ClassButton'
import styles from './index.module.scss'

interface ClassButtonsProps {
  onClassSelect: (classType: SpeedRunClass) => void
  selectedClass: SpeedRunClass
}

function ClassButtons({ onClassSelect, selectedClass }: ClassButtonsProps) {
  const classes = Object.values(SpeedRunClass)

  return (
    <div className={styles.classButtons}>
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

export default memo(ClassButtons)
