import { IconProps } from './types'

export function HourglassIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path d="M5 3h14v4a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4V3z" />
      <path d="M5 21h14v-4a4 4 0 0 0-4-4h-6a4 4 0 0 0-4 4v4z" />
      <path d="M9 11h6" />
      <path d="M12 14.5c0-1.5-1-2.5-3-3.5 2-1 3-2 3-3.5" stroke="currentColor" strokeWidth="1" />
      <path d="M9.5 5.5l1 1.5M14.5 5.5l-1 1.5" strokeWidth="1.5" />
      <path d="M9.5 18.5l1-1.5M14.5 18.5l-1-1.5" strokeWidth="1.5" />
      <path d="M9 7l3 1 3-1" fill="none" strokeWidth="1" />
      <path d="M9 17l3-1 3 1" fill="none" strokeWidth="1" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
