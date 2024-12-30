import { useRef } from 'react'

import { useNumberFormatter } from '@react-aria/i18n'
import { useSlider, useSliderThumb } from '@react-aria/slider'
import { mergeProps } from '@react-aria/utils'
import { VisuallyHidden } from '@react-aria/visually-hidden'
import { SliderState, useSliderState } from '@react-stately/slider'

import { GAME_VERSION_VALUES } from '../../../../constants/chartControlValues'
import { SpeedRunClass } from '../../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../../utils/colors'

import styles from './index.module.scss'

interface VersionRangeSliderProps {
  selectedClass: SpeedRunClass
  minVersion: string
  maxVersion: string
  onChange: (values: [string, string]) => void
  onPointerDown: () => void
  isActive: boolean
}

function VersionRangeSlider({
  selectedClass,
  minVersion,
  maxVersion,
  onChange,
  onPointerDown,
  isActive,
}: VersionRangeSliderProps) {
  const trackRef = useRef(null)
  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkestColor = getClassColor(selectedClass, ClassColorVariant.Darkest)

  const state = useSliderState({
    numberFormatter: useNumberFormatter(),
    minValue: 0,
    maxValue: GAME_VERSION_VALUES.length - 1,
    step: 1,
    value: [GAME_VERSION_VALUES.indexOf(minVersion), GAME_VERSION_VALUES.indexOf(maxVersion)],
    onChange: ([min, max]) => {
      onChange([GAME_VERSION_VALUES[min], GAME_VERSION_VALUES[max]])
    },
  })

  const { groupProps, trackProps } = useSlider(
    {
      'aria-label': 'Game version range',
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
        style={{ '--track-color': isActive ? darkestColor : '#444' } as React.CSSProperties}
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
              left: `${state.getThumbPercent(0) * 100}%`,
              width: `${(state.getThumbPercent(1) - state.getThumbPercent(0)) * 100}%`,
            } as React.CSSProperties
          }
        />
        <Thumb index={0} state={state} trackRef={trackRef} />
        <Thumb index={1} state={state} trackRef={trackRef} />
      </div>
      <div className={styles.marks}>
        {GAME_VERSION_VALUES.map((version, i) => (
          <div
            key={version}
            className={styles.mark}
            style={{
              left: `${(i / (GAME_VERSION_VALUES.length - 1)) * 100}%`,
            }}
          >
            <span className={styles.markLabel}>{version}</span>
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

export default VersionRangeSlider
