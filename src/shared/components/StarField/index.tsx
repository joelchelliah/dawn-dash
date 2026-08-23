import { createCx } from '@/shared/utils/classnames'

import { UPPER_STARS, LOWER_STARS, Star } from './stars'
import styles from './index.module.scss'

const cx = createCx(styles)

interface StarFieldProps {
  position: 'upper' | 'lower'
}

// Radius at and above which a star is drawn as a four-point sparkle rather than a glow.
const SPARKLE_MIN_RADIUS = 2.1

/**
 * Animated star field for the top and bottom of a page background — the moving
 * counterpart to the static `starsTexture` mixin.
 *
 * The static texture stays as the fallback and is hidden on any container that renders
 * this component, except under `prefers-reduced-motion`, where the roles swap back.
 */
const StarField = ({ position }: StarFieldProps) => {
  const stars: Star[] = position === 'upper' ? UPPER_STARS : LOWER_STARS

  return (
    <div className={cx('star-field', `star-field--${position}`)} aria-hidden="true">
      {stars.map((star, index) => (
        <span
          key={index}
          className={cx('star', { 'star--sparkle': star.radius >= SPARKLE_MIN_RADIUS })}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.radius * 2}px`,
            height: `${star.radius * 2}px`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export default StarField
