import Button from '../../../../shared/components/Buttons/Button'
import { SpeedRunClass } from '../../../types/speedRun'
import { getClassColor, ClassColorVariant } from '../../../utils/colors'

import styles from './index.module.scss'

interface PrimaryButtonProps {
  children: React.ReactNode
  onClick: () => void
  selectedClass: SpeedRunClass
}

function PrimaryButton({ children, onClick, selectedClass }: PrimaryButtonProps): JSX.Element {
  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkColor = getClassColor(selectedClass, ClassColorVariant.Dark)

  const buttonStyle = {
    borderColor: darkColor,
    '--color': defaultColor,
    '--hover-bg-color': defaultColor,
  } as React.CSSProperties

  return (
    <Button className={styles['primary-button']} style={buttonStyle} onClick={onClick}>
      {children}
    </Button>
  )
}

export default PrimaryButton
