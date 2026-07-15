import { IconProps } from './types'

export function MagnifyingGlassIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <circle cx="10.5" cy="10.5" r="7.5" strokeWidth="3.5" />
      <line x1="22" y1="22" x2="16.5" y2="16.5" strokeWidth="4.5" />
      <path d="M10.5 7a3.5 3.5 0 0 1 0 7" fill="currentColor" stroke="none" />
    </svg>
  )
}
