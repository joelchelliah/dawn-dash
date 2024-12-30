import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor, ClassColorVariant } from '../../utils/colors'

import styles from './index.module.scss'

interface LoadingDotsProps {
  selectedClass: SpeedRunClass
  text?: string
}

function LoadingDots({ text, selectedClass }: LoadingDotsProps) {
  const color = getClassColor(selectedClass, ClassColorVariant.Lighter)

  return (
    <div className={styles['container']}>
      {text}{' '}
      <span className={styles['loading-dots']} style={{ color }}>
        <span>●</span>
        <span>●</span>
        <span>●</span>
      </span>
    </div>
  )
}

export default LoadingDots
