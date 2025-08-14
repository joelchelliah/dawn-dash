import { createCx } from '@/shared/utils/classnames'
import Button from '@/shared/components/Buttons/Button'

import { SpeedRunClass } from '@/speedruns/types/speedRun'
import { ClassColorVariant, getClassColor } from '@/speedruns/utils/colors'

import styles from './index.module.scss'

const cx = createCx(styles)

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
    <Button className={cx('secondary-button')} style={buttonStyle} onClick={onClick}>
      {children}
    </Button>
  )
}

export default SecondaryButton
