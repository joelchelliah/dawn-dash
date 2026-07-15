import { IconProps } from './types'

export function StackedCardsIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      <rect
        x="10"
        y="3"
        width="12"
        height="16"
        rx="1"
        ry="1"
        fill="currentColor"
        opacity="0.3"
        transform="rotate(15, 10, 3)"
      />
      <rect
        x="6"
        y="3"
        width="12"
        height="16"
        rx="1"
        ry="1"
        fill="currentColor"
        opacity="0.6"
        transform="rotate(7, 6, 3)"
      />
      <rect
        x="2"
        y="4"
        width="12"
        height="16"
        rx="1"
        ry="1"
        fill="currentColor"
        transform="rotate(-5, 2, 4)"
      />
      <path
        d="M3 7h2v2h-2z M9 15h2v2h-2z"
        fill="white"
        opacity="0.7"
        transform="rotate(-5, 2, 4)"
      />
      <path
        d="M5 10c0.5 0.5 1.5 1.5 1.5 3s-1 3-1.5 3.5"
        stroke="white"
        strokeWidth="0.5"
        opacity="0.7"
        fill="none"
        transform="rotate(-5, 2, 4)"
      />
    </svg>
  )
}
