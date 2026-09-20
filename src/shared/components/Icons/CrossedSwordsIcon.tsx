import { IconProps } from './types'

// Each sword is drawn upright in local space, then the pair is mirrored by rotating
// +/-45deg around the centre. Drawing it axis-aligned first is what keeps the blade,
// guard, grip and pommel concentric — rotated coordinates drift apart by hand.
const sword = (
  <>
    <path d="M12 1.3 L13.45 4.3 L13.45 14.4 L10.55 14.4 L10.55 4.3 Z" />
    <rect x="8.2" y="14.4" width="7.6" height="1.9" rx="0.85" />
    <rect x="11.1" y="16.3" width="1.8" height="4.3" rx="0.6" />
    <rect x="9.8" y="20.1" width="4.4" height="1.8" rx="0.9" />
  </>
)

export function CrossedSwordsIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <g transform="rotate(45, 12, 12)" opacity="0.5">
        {sword}
      </g>
      <g transform="rotate(-45, 12, 12)">{sword}</g>
    </svg>
  )
}
