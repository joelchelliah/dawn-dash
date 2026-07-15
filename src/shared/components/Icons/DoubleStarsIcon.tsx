import { IconProps } from './types'

export function DoubleStarsIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path d="M5 4L7 10H13L8 14L10 20L5 16L0 20L2 14L-3 10H3L5 4Z" />
      <path d="M19 4L21 10H27L22 14L24 20L19 16L14 20L16 14L11 10H17L19 4Z" />
    </svg>
  )
}
