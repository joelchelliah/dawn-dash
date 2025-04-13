interface IconProps {
  className?: string
  onClick?: () => void
}

export function GitHubIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.237 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

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

export function DropdownArrowIconUrl(fillColor: string) {
  const encodedSvg = `data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22${encodeURIComponent(fillColor)}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E`
  return `url('${encodedSvg}')`
}

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

export function DoubleStarsIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      <path d="M5 4L7 10H13L8 14L10 20L5 16L0 20L2 14L-3 10H3L5 4Z" />
      <path d="M19 4L21 10H27L22 14L24 20L19 16L14 20L16 14L11 10H17L19 4Z" />
    </svg>
  )
}

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

export function CircleIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      <circle cx="12" cy="14" r="6.5" />
    </svg>
  )
}

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

export function HamburgerIcon({ className = '', onClick }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 32 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="xMidYMid meet"
      onClick={onClick}
    >
      <line x1="3" y1="4" x2="29" y2="4" />
      <line x1="3" y1="12" x2="29" y2="12" />
      <line x1="3" y1="20" x2="29" y2="20" />
    </svg>
  )
}
