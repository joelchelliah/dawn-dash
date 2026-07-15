import { createCx } from '@/shared/utils/classnames'
import Button from '@/shared/components/Buttons/Button'
import { BaseButtonProps } from '@/shared/components/Buttons/types'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ClassColorButtonProps extends BaseButtonProps {
  selectedClass: CharacterClass
  variant: 'primary' | 'secondary'
}

function ClassColorButton({
  children,
  onClick,
  selectedClass,
  variant,
  className,
  disabled,
  type,
  ariaLabel,
}: ClassColorButtonProps): JSX.Element {
  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkColor = getClassColor(selectedClass, ClassColorVariant.Dark)
  const darkerColor = getClassColor(selectedClass, ClassColorVariant.Darker)

  const buttonStyle =
    variant === 'primary'
      ? ({
          borderColor: darkColor,
          '--color': defaultColor,
          '--hover-bg-color': defaultColor,
        } as React.CSSProperties)
      : ({
          borderColor: darkerColor,
          '--color': darkerColor,
          '--hover-color': defaultColor,
        } as React.CSSProperties)

  return (
    <Button
      className={cx('class-color-button', `class-color-button--${variant}`, className)}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled}
      type={type}
      ariaLabel={ariaLabel}
    >
      {children}
    </Button>
  )
}

export default ClassColorButton
