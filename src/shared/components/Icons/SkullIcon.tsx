import { IconProps } from './types'

export function SkullIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      <path
        d="M12 4c-3.31 0-6 2.69-6 6 0 1.1.3 2.12.8 3h10.4c.5-.88.8-1.9.8-3 0-3.31-2.69-6-6-6z M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M15 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path d="M12 13c-1.1 0-2 .9-2 2h4c0-1.1-.9-2-2-2z" />
      <path d="M8 16h8v2H8z" />
    </svg>
  )
}
