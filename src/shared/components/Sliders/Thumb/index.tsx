import { useRef } from 'react'

import { useSliderThumb } from '@react-aria/slider'
import { mergeProps } from '@react-aria/utils'
import { VisuallyHidden } from '@react-aria/visually-hidden'
import { SliderState } from '@react-stately/slider'

import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ThumbProps {
  state: SliderState
  trackRef: React.RefObject<HTMLDivElement>
  index: number
  energyIcon: string
  orientation?: 'horizontal' | 'vertical'
  /**
   * Pulls the thumb's travel in from both ends of the track by this CSS length
   * (e.g. '0.5rem'), so the orb stops short of the edges instead of centering on
   * them. Purely visual — the track keeps its full size and the slider still
   * reports its full value range. Defaults to no inset.
   */
  travelInset?: string
}

function Thumb({
  state,
  trackRef,
  index,
  energyIcon,
  orientation = 'horizontal',
  travelInset,
}: ThumbProps) {
  const inputRef = useRef(null)
  const { thumbProps, inputProps } = useSliderThumb(
    {
      index,
      trackRef,
      inputRef,
    },
    state
  )

  // react-aria positions the thumb with a raw percentage along the track (`left`
  // when horizontal, `top` when vertical). Remap it into a narrower band so the
  // endpoints sit inside the track's edges.
  //
  // The shift runs from -inset at 0% to +inset at 100%. Do NOT reformulate this as
  // `inset + offset * (1 - 2 * inset / 100%)` — dividing a length by a percentage
  // is invalid CSS, so the browser drops the whole declaration silently.
  const insetTravel = (offset: string | number | undefined) => {
    if (!travelInset || typeof offset !== 'string') return offset

    const fraction = parseFloat(offset) / 100
    if (Number.isNaN(fraction)) return offset

    const shift = Math.round((2 * fraction - 1) * 1e4) / 1e4

    return `calc(${offset} - ${travelInset} * ${shift})`
  }

  const isVertical = orientation === 'vertical'
  const thumbStyle = {
    ...thumbProps.style,
    top: isVertical ? insetTravel(thumbProps.style?.top) : thumbProps.style?.top,
    left: isVertical ? thumbProps.style?.left : insetTravel(thumbProps.style?.left),
    '--energy-icon': energyIcon,
  } as React.CSSProperties

  return (
    <div {...thumbProps} className={cx('thumb', `thumb--${orientation}`)} style={thumbStyle}>
      <VisuallyHidden>
        <input ref={inputRef} {...mergeProps(inputProps)} />
      </VisuallyHidden>
    </div>
  )
}

export default Thumb
