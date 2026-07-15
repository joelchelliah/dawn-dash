import { IconProps } from './types'

export function CrossIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5" // Main stroke width
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path d="M 4.7 7.8 Q 12.2 8.8, 19.4 16.2" />
      <path d="M 16.0 3.7 Q 10.3 9.4, 9.2 21.0" />
    </svg>
  )
}
