import { memo } from 'react'

import { SpeedRunClass, SpeedRunSubclass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'

import styles from './index.module.scss'
import SubclassButton from './SubclassButton'

interface SubclassButtonsProps {
  onSubclassSelect: (subclass: SpeedRunSubclass) => void
  selectedSubclass: SpeedRunSubclass
}

function SubclassButtons({ onSubclassSelect, selectedSubclass }: SubclassButtonsProps) {
  const subclasses = Object.values(SpeedRunSubclass)

  const defaultColor = getClassColor(SpeedRunClass.Sunforge, ClassColorVariant.Default)
  const darkColor = getClassColor(SpeedRunClass.Sunforge, ClassColorVariant.Darker)

  const borderStyle = { borderColor: darkColor }

  return (
    <div className={styles['subclass-buttons']} style={borderStyle}>
      <h3 className={styles['subclass-buttons__title']} style={{ color: defaultColor }}>
        Sunforge subclass
      </h3>

      <div className={styles['subclass-buttons__buttons']}>
        {subclasses.map((subclass) => (
          <SubclassButton
            key={subclass}
            subclass={subclass}
            isActive={selectedSubclass === subclass}
            onClick={() => onSubclassSelect(subclass)}
          />
        ))}
      </div>
    </div>
  )
}

export default memo(SubclassButtons)
