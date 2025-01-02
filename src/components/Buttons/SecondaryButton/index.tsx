import { SpeedRunClass } from '../../../types/speedRun'
import { getClassColor, ClassColorVariant } from '../../../utils/colors'
import Button from '../Button'

import styles from './index.module.scss'

interface SecondaryButtonProps {
  children: React.ReactNode
  onClick: () => void
  selectedClass: SpeedRunClass
}

function SecondaryButton({ children, onClick, selectedClass }: SecondaryButtonProps): JSX.Element {
  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkerColor = getClassColor(selectedClass, ClassColorVariant.Darker)

  const buttonStyle = {
    borderColor: darkerColor,
    '--color': darkerColor,
    '--hover-color': defaultColor,
  } as React.CSSProperties

  return (
    <Button className={styles['secondary-button']} style={buttonStyle} onClick={onClick}>
      {children}
    </Button>
  )
}

export default SecondaryButton
