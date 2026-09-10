import { IconProps } from './types'

export function CheckIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path d="M 3.8 13.2 Q 7.4 14.4, 9.6 19.2" />
      <path d="M 9.6 19.2 Q 13.4 9.2, 20.4 4.4" />
    </svg>
  )
}
