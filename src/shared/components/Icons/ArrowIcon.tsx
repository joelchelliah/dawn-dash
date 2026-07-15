import { IconProps } from './types'

export function ArrowIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <path d="M12 4l-8 8h4v8h8v-8h4l-8-8z" />
    </svg>
  )
}
