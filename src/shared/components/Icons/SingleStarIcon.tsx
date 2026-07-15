import { IconProps } from './types'

export function SingleStarIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      <path d="M12 6L13.5 11H18.5L14.5 14L16 19L12 16L8 19L9.5 14L5.5 11H10.5L12 6Z" />
    </svg>
  )
}
