import { IconProps } from './types'

export function PawIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      <ellipse cx="8" cy="7" rx="1.5" ry="2" />
      <ellipse cx="12" cy="5.5" rx="1.5" ry="2" />
      <ellipse cx="16" cy="7" rx="1.5" ry="2" />
      <ellipse cx="12" cy="15" rx="4.5" ry="4.5" />
    </svg>
  )
}
