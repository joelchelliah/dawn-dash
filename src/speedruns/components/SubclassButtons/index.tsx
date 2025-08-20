import { memo } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import { SpeedRunSubclass } from '@/speedruns/types/speedRun'

import styles from './index.module.scss'
import SubclassButton from './SubclassButton'

const cx = createCx(styles)

interface SubclassButtonsProps {
  onSubclassSelect: (subclass: SpeedRunSubclass) => void
  selectedSubclass: SpeedRunSubclass
}

function SubclassButtons({ onSubclassSelect, selectedSubclass }: SubclassButtonsProps) {
  const subclasses = Object.values(SpeedRunSubclass)

  const defaultColor = getClassColor(CharacterClass.Sunforge, ClassColorVariant.Default)
  const darkColor = getClassColor(CharacterClass.Sunforge, ClassColorVariant.Darker)

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
