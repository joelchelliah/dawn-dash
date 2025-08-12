import { useRef } from 'react'

import { useSlider } from '@react-aria/slider'
import { SliderState } from '@react-stately/slider'

import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import { getEnergyImageUrl } from '../../../utils/images'
import Thumb from '../Thumb'
import { createCx } from '../../../../shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface SliderProps {
  state: SliderState
  values: string[]
  onPointerDown: () => void
  ariaLabel: string
  isActive: boolean
  selectedClass: SpeedRunClass
  doubleThumbs?: boolean
}

function Slider({
  state,
  values,
  onPointerDown,
  ariaLabel,
  isActive,
  selectedClass,
  doubleThumbs = false,
}: SliderProps) {
  const trackRef = useRef(null)

  const { groupProps, trackProps } = useSlider(
    {
      'aria-label': ariaLabel,
      value: state.values,
    },
    state,
    trackRef
  )

  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkestColor = getClassColor(selectedClass, ClassColorVariant.Darkest)
  const lightestColor = getClassColor(selectedClass, ClassColorVariant.ControlText)

  const neutralColor = '#BBB'
  const fillColor = isActive ? defaultColor : darkestColor
  const trackColor = doubleThumbs ? darkestColor : fillColor
  const markColor = isActive ? neutralColor : darkestColor
  const markSelectedColor = isActive ? lightestColor : darkestColor
  const energyIcon = isActive ? `url(${getEnergyImageUrl(selectedClass)})` : 'transparent'

  const trackStyle = { '--track-color': trackColor } as React.CSSProperties
  const singleFillStyle = {
    '--fill-color': fillColor,
    width: `${state.getThumbPercent(0) * 100}%`,
  } as React.CSSProperties
  const doubleFillStyle = {
    '--fill-color': fillColor,
    left: `${state.getThumbPercent(0) * 100}%`,
    width: `${(state.getThumbPercent(1) - state.getThumbPercent(0)) * 100}%`,
  } as React.CSSProperties
  const fillStyle = doubleThumbs ? doubleFillStyle : singleFillStyle

  const getMarkStyle = (index: number) => {
    const isSelected = state.getThumbValue(0) === index || state.getThumbValue(1) === index

    return {
      left: `${(index / (values.length - 1)) * 100}%`,
      '--mark-color': isActive && isSelected ? markSelectedColor : markColor,
      fontWeight: isActive && isSelected ? 'bold' : 'normal',
    } as React.CSSProperties
  }

  return (
    <div {...groupProps} className={cx('slider')}>
      <div
        {...trackProps}
        ref={trackRef}
        className={cx('track')}
        style={trackStyle}
        onPointerDown={(e) => {
          onPointerDown()
          trackProps.onPointerDown?.(e)
        }}
      >
        <div className={cx('track-fill')} style={fillStyle} />
        {Array.from({ length: doubleThumbs ? 2 : 1 }).map((_, index) => (
          <Thumb
            key={index}
            state={state}
            trackRef={trackRef}
            index={index}
            energyIcon={energyIcon}
          />
        ))}
      </div>
      <div className={cx('marks')}>
        {values.map((value, i) => (
          <div key={value} className={cx('mark')} style={getMarkStyle(i)}>
            <span className={cx('mark__label')}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Slider
