import styles from './index.module.scss'

type Spacing = 'sm' | 'md' | 'lg'

interface GradientDividerProps {
  spacingBottom?: Spacing
}

const GradientDivider = ({ spacingBottom = 'sm' }: GradientDividerProps) => {
  const spacingBottomMap = {
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
  }

  return (
    <div
      className={styles['gradient-divider']}
      style={{ marginBottom: spacingBottomMap[spacingBottom] }}
    />
  )
}

export default GradientDivider
