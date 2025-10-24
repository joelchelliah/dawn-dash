import { memo } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'

import ClassButton from './ClassButton'
import styles from './index.module.scss'

const cx = createCx(styles)

interface ClassButtonsProps {
  onClassSelect: (classType: CharacterClass) => void
  selectedClass: CharacterClass
}

function ClassButtons({ onClassSelect, selectedClass }: ClassButtonsProps) {
  const classes = Object.values(CharacterClass).filter((c) => c !== CharacterClass.Neutral)

  return (
    <div className={cx('class-buttons')}>
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
