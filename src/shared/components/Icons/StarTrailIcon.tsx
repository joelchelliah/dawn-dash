import { IconProps } from './types'

// One star shape reused as three copies, each fainter and rotated a little further —
// the same offset-and-dim trick StackedCardsIcon uses for its card stack. The copies
// arc up to the right rather than sitting on a line: the rise between them grows
// faster than the run, which is what makes it read as a star dropping along a curve
// instead of shooting straight. The star is drawn centred on the origin so each copy
// only needs a translate; the notches are kept shallow (inner radius 4.6 of 8.4)
// because a spikier star interleaves with the copies behind it and becomes a thicket
// at 20px.
const STAR_PATH =
  'M0 -8.4 L2.7 -3.72 L7.99 -2.6 L4.37 1.42 L4.94 6.8 L0 4.6 L-4.94 6.8 L-4.37 1.42 L-7.99 -2.6 L-2.7 -3.72 Z'

export function StarTrailIcon({ className = '', onClick }: IconProps): JSX.Element {
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
      {/* The arc is laid out in its own comfortable space, then this wrapper scales and
          centres the whole trail so the faintest copy stays inside the 24x24 viewBox. */}
      <g transform="translate(-0.93, 4.67) scale(0.862)">
        <g transform="translate(21, 5.4) rotate(20)" opacity="0.2">
          <path d={STAR_PATH} />
        </g>
        <g transform="translate(15, 8.2) rotate(10)" opacity="0.5">
          <path d={STAR_PATH} />
        </g>
        <g transform="translate(10, 12.8)">
          <path d={STAR_PATH} />
        </g>
      </g>
    </svg>
  )
}
