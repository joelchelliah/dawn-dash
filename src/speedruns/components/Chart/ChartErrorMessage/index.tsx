import { createCx } from '@/shared/utils/classnames'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import PrimaryButton from '../../Buttons/PrimaryButton'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ChartErrorMessageProps {
  selectedClass: CharacterClass
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
