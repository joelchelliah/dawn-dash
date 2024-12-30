import { useRef } from 'react'

import { useNumberFormatter } from '@react-aria/i18n'
import { useSlider, useSliderThumb } from '@react-aria/slider'
import { mergeProps } from '@react-aria/utils'
import { VisuallyHidden } from '@react-aria/visually-hidden'
import { SliderState, useSliderState } from '@react-stately/slider'

import { LAST_DAYS_VALUES } from '../../../../constants/chartControlValues'
import { SpeedRunClass } from '../../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../../utils/colors'

import styles from './index.module.scss'

interface NumberOfDaysSliderProps {
  selectedClass: SpeedRunClass
  value: string
  onChange: (value: string) => void
  onPointerDown: () => void
  isActive: boolean
}

function NumberOfDaysSlider({
  selectedClass,
  value,
  onChange,
  onPointerDown,
  isActive,
}: NumberOfDaysSliderProps) {
  const trackRef = useRef(null)
  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkestColor = getClassColor(selectedClass, ClassColorVariant.Darkest)
  const state = useSliderState({
    numberFormatter: useNumberFormatter(),
    minValue: 0,
    maxValue: LAST_DAYS_VALUES.length - 1,
    step: 1,
    value: LAST_DAYS_VALUES.indexOf(value),
    onChange: (index) => {
      onChange(LAST_DAYS_VALUES[index])
    },
  })

  const { groupProps, trackProps } = useSlider(
    {
      'aria-label': 'Number of days',
      value: state.values,
    },
    state,
    trackRef
  )

  return (
    <div {...groupProps} className={styles.slider}>
      <div
        {...trackProps}
        ref={trackRef}
        className={styles.track}
        style={{ '--track-color': isActive ? defaultColor : darkestColor } as React.CSSProperties}
        onPointerDown={(e) => {
          onPointerDown()
          trackProps.onPointerDown?.(e)
        }}
      >
        <div
          className={styles.trackFill}
          style={
            {
              '--fill-color': isActive ? defaultColor : darkestColor,
              width: `${state.getThumbPercent(0) * 100}%`,
            } as React.CSSProperties
          }
        />
        <Thumb state={state} trackRef={trackRef} index={0} />
      </div>
      <div className={styles.marks}>
        {LAST_DAYS_VALUES.map((days, i) => (
          <div
            key={days}
            className={styles.mark}
            style={{
              left: `${(i / (LAST_DAYS_VALUES.length - 1)) * 100}%`,
            }}
          >
            <span className={styles.markLabel}>{days}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ThumbProps {
  state: SliderState
  trackRef: React.RefObject<HTMLDivElement>
  index: number
}

function Thumb({ state, trackRef, index }: ThumbProps) {
  const inputRef = useRef(null)
  const { thumbProps, inputProps } = useSliderThumb(
    {
      index,
      trackRef,
      inputRef,
    },
    state
  )

  return (
    <div {...thumbProps} className={styles.thumb}>
      <VisuallyHidden>
        <input ref={inputRef} {...mergeProps(inputProps)} />
      </VisuallyHidden>
    </div>
  )
}

export default NumberOfDaysSlider
