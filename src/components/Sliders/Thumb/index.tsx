import { useRef } from 'react'

import { useSliderThumb } from '@react-aria/slider'
import { mergeProps } from '@react-aria/utils'
import { VisuallyHidden } from '@react-aria/visually-hidden'
import { SliderState } from '@react-stately/slider'

import styles from './index.module.scss'

interface ThumbProps {
  state: SliderState
  trackRef: React.RefObject<HTMLDivElement>
  index: number
  energyIcon: string
}

function Thumb({ state, trackRef, index, energyIcon }: ThumbProps) {
  const inputRef = useRef(null)
  const { thumbProps, inputProps } = useSliderThumb(
    {
      index,
      trackRef,
      inputRef,
    },
    state
  )
  const thumbStyle = {
    ...thumbProps.style,
    '--energy-icon': energyIcon,
  } as React.CSSProperties

  return (
    <div {...thumbProps} className={styles['thumb']} style={thumbStyle}>
      <VisuallyHidden>
        <input ref={inputRef} {...mergeProps(inputProps)} />
      </VisuallyHidden>
    </div>
  )
}

export default Thumb
