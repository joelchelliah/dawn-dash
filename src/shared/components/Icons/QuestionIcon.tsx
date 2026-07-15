import { IconProps } from './types'

export function QuestionIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      onClick={onClick}
    >
      <path d="M6 7C6 4.5 9 3 12 3s6 1.5 6 4.5c0 3-6 4.5-6 4.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  )
}
