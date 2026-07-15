import { IconProps } from './types'

export function TripleStarsIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      <path d="M12 2L13.5 7H18.5L14.5 10L16 15L12 12L8 15L9.5 10L5.5 7H10.5L12 2Z" />
      <path d="M6 13L7.5 18H12.5L8.5 21L10 26L6 23L2 26L3.5 21L-0.5 18H4.5L6 13Z" />
      <path d="M18 13L19.5 18H24.5L20.5 21L22 26L18 23L14 26L15.5 21L11.5 18H16.5L18 13Z" />
    </svg>
  )
}
