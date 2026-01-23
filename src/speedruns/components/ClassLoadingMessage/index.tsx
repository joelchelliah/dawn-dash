import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'
import { useDeviceOrientation } from '@/shared/hooks/useDeviceOrientation'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'

import { Difficulty } from '@/speedruns/types/speedRun'
import { getClassImageUrl } from '@/speedruns/utils/images'

import ClassLoadingDots from '../ClassLoadingDots'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ClassLoadingMessageProps {
  selectedClass: CharacterClass
  selectedDifficulty: Difficulty
  isVisible: boolean
}

function ClassLoadingMessage({
  isVisible,
  selectedClass,
  selectedDifficulty,
}: ClassLoadingMessageProps) {
  const { isMobileAndPortrait } = useDeviceOrientation()

  if (!isVisible) return null

  const imageUrl = getClassImageUrl(selectedClass)
  const color = getClassColor(selectedClass, ClassColorVariant.Lighter)
  const classAndDifficulty =
    selectedClass === CharacterClass.Sunforge
      ? 'Sunforge'
      : `${selectedClass} - ${selectedDifficulty}`
  const containerClassName = cx('container', {
    'container--max-height': !isMobileAndPortrait,
  })

  return (
    <div className={containerClassName}>
      <Image
        src={imageUrl}
        alt={`${selectedClass} icon`}
        className={cx('loading-icon')}
        width={70}
        height={70}
        optimized
      />
      <div className={cx('loading-text')}>
        Loading{' '}
        <span className={cx('class-name')} style={{ color }}>
          {classAndDifficulty}
        </span>{' '}
        <span className={cx('last-line')}>
          data
          <ClassLoadingDots selectedClass={selectedClass} />
        </span>
      </div>
    </div>
  )
}

export default ClassLoadingMessage
