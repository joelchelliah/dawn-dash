import styles from './index.module.scss'

type Spacing = 'xs' | 'sm' | 'md' | 'lg'

interface GradientDividerProps {
  spacingBottom: Spacing
  widthPercentage?: number
}

const GradientDivider = ({ spacingBottom = 'sm', widthPercentage = 100 }: GradientDividerProps) => {
  const spacingBottomMap = {
    xs: '-0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
  }

  return (
    <div
      className={styles['gradient-divider']}
      style={{
        margin: 'auto',
        marginBottom: spacingBottomMap[spacingBottom],
        width: `${widthPercentage}%`,
      }}
    />
  )
}

export default GradientDivider
