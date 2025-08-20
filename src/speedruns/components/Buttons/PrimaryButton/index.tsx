import { createCx } from '@/shared/utils/classnames'
import Button from '@/shared/components/Buttons/Button'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'

import { SpeedRunClass } from '@/speedruns/types/speedRun'

import styles from './index.module.scss'

const cx = createCx(styles)

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
    <Button className={cx('primary-button')} style={buttonStyle} onClick={onClick}>
      {children}
    </Button>
  )
}

export default PrimaryButton
