import { createCx } from '../../../../shared/utils/classnames'
import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import PrimaryButton from '../../Buttons/PrimaryButton'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ChartErrorMessageProps {
  selectedClass: SpeedRunClass
  message: string
  isVisible: boolean
  buttonText?: string
  onClick?: () => void
}

function ChartErrorMessage({
  selectedClass,
  message,
  isVisible,
  buttonText,
  onClick,
}: ChartErrorMessageProps) {
  if (!isVisible) return null
  const errorMessageStyle = {
    color: getClassColor(selectedClass, ClassColorVariant.Dark),
  }

  return (
    <div className={cx('error-message')} style={errorMessageStyle}>
      {message}
      {onClick && (
        <PrimaryButton selectedClass={selectedClass} onClick={onClick}>
          {buttonText || 'Okay!'}
        </PrimaryButton>
      )}
    </div>
  )
}

export default ChartErrorMessage
