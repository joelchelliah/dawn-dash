import { IconProps } from './types'

export function CloseMenuIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      width="80"
      height="24"
      viewBox="0 0 80 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      onClick={onClick}
    >
      <text
        x="4"
        y="16"
        fontSize="14"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
      >
        Menu
      </text>

      <path d="M56 7l12 10M68 7l-12 10" />
    </svg>
  )
}
