import { memo } from 'react'

import { SpeedRunClass, SpeedRunSubclass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { createCx } from '../../../shared/utils/classnames'

import styles from './index.module.scss'
import SubclassButton from './SubclassButton'

const cx = createCx(styles)

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
    <div className={cx('subclass-buttons')} style={borderStyle}>
      <h3 className={cx('subclass-buttons__title')} style={{ color: defaultColor }}>
        Sunforge subclass
      </h3>

      <div className={cx('subclass-buttons__buttons')}>
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
