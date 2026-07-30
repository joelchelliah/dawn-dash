import { useEffect, useRef, useState } from 'react'

import { useSlider } from '@react-aria/slider'
import { useNumberFormatter } from '@react-aria/i18n'
import { useSliderState } from '@react-stately/slider'

import { createCx } from '@/shared/utils/classnames'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'
import { getEnergyImageUrl } from '@/shared/utils/energyImages'
import Thumb from '@/shared/components/Sliders/Thumb'

import { ZoomLevel, ZOOM_STOPS, formatZoomLabel } from '@/codex/constants/zoomValues'

import styles from './index.module.scss'

const cx = createCx(styles)

// Half the tick diameter (0.25rem in the stylesheet), so an end tick's edge
// lands exactly on the track's edge rather than crossing it.
const TICK_INSET = '0.125rem'

// How far the thumb's travel stops short of each end of the track, per
// orientation. Purely visual — the track keeps its full size and the value range
// is unchanged; the orb just doesn't ride all the way out to the rounded caps.
// Raise to pull the endpoints further in, '0' to let it reach the very edges.
const THUMB_TRAVEL_INSET = {
  horizontal: '0.5rem',
  vertical: '0.125rem',
}

interface ZoomSliderProps {
  selectedClass: CharacterClass
  zoomLevel: ZoomLevel
  setZoomLevel: (zoom: ZoomLevel) => void
  orientation?: 'horizontal' | 'vertical'
  disabled?: boolean
  className?: string
}

/**
 * Zoom control for the codex trees.
 *
 * The tree redraw is expensive (full D3 teardown + redraw), so `setZoomLevel` is
 * only called when the drag ends. While dragging, the thumb and the number label
 * follow a local pending index, leaving the tree untouched. This also avoids
 * dragging *through* the Cover stop, which would make the event tree re-measure
 * and re-cache its cover scale from mid-drag container dimensions.
 *
 * Arrow-key stepping commits immediately — key repeat is slow enough that
 * per-step redraws are acceptable.
 */
const ZoomSlider = ({
  selectedClass,
  zoomLevel,
  setZoomLevel,
  orientation = 'horizontal',
  disabled = false,
  className,
}: ZoomSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const committedIndex = Math.max(0, ZOOM_STOPS.indexOf(zoomLevel))
  const [pendingIndex, setPendingIndex] = useState(committedIndex)

  // Keep the thumb in sync when zoom is changed elsewhere (e.g. reset to Cover
  // on event/keyword change), but never while the user is mid-drag.
  useEffect(() => {
    if (!isDraggingRef.current) setPendingIndex(committedIndex)
  }, [committedIndex])

  const state = useSliderState({
    numberFormatter: useNumberFormatter(),
    minValue: 0,
    maxValue: ZOOM_STOPS.length - 1,
    step: 1,
    orientation,
    isDisabled: disabled,
    value: pendingIndex,
    onChange: (index) => setPendingIndex(index as number),
    onChangeEnd: (index) => {
      isDraggingRef.current = false
      setZoomLevel(ZOOM_STOPS[index as number])
    },
  })

  const { groupProps, trackProps } = useSlider(
    { 'aria-label': 'Zoom', orientation, isDisabled: disabled },
    state,
    trackRef
  )

  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkestColor = getClassColor(selectedClass, ClassColorVariant.Darkest)

  const isVertical = orientation === 'vertical'
  const zoomValueLabel = formatZoomLabel(ZOOM_STOPS[pendingIndex])

  // react-aria puts the minimum value at the bottom in vertical mode (it sets
  // the thumb's `top` to 100% at the minimum), so Cover sits at the bottom and
  // the fill grows upward from there. `getThumbPercent` is orientation-agnostic.
  const fillPercent = `${state.getThumbPercent(0) * 100}%`

  const trackStyle = { '--track-color': darkestColor } as React.CSSProperties
  const fillStyle = {
    '--fill-color': disabled ? darkestColor : defaultColor,
    width: isVertical ? undefined : fillPercent,
    height: isVertical ? fillPercent : undefined,
  } as React.CSSProperties

  // Ticks are spread across the track but inset from both ends, so the first and
  // last dots sit fully inside the rounded caps instead of poking out and looking
  // like a second bar behind the track.
  const getTickStyle = (index: number) => {
    const ratio = index / (ZOOM_STOPS.length - 1)
    const offset = `calc(${TICK_INSET} + ${ratio} * (100% - 2 * ${TICK_INSET}))`
    const isActive = index <= pendingIndex

    return {
      '--tick-color': disabled || !isActive ? darkestColor : defaultColor,
      left: isVertical ? undefined : offset,
      bottom: isVertical ? offset : undefined,
    } as React.CSSProperties
  }

  return (
    <div className={cx('zoom-slider', `zoom-slider--${orientation}`, className)}>
      <span
        className={cx('zoom-slider__label')}
        style={{ color: disabled ? darkestColor : defaultColor }}
      >
        Zoom
      </span>

      <div {...groupProps} className={cx('zoom-slider__group')}>
        <div
          {...trackProps}
          ref={trackRef}
          className={cx('zoom-slider__track')}
          style={trackStyle}
          onPointerDown={(e) => {
            isDraggingRef.current = true
            trackProps.onPointerDown?.(e)
          }}
        >
          <div className={cx('zoom-slider__track-fill')} style={fillStyle} />
          {ZOOM_STOPS.map((stop, index) => (
            <div
              key={String(stop)}
              className={cx('zoom-slider__tick')}
              style={getTickStyle(index)}
            />
          ))}
          {/* Horizontal only: overlaid on the track so a thicker track doesn't
              make the control taller. Rendered before the thumb so the thumb
              paints on top where the two overlap. The vertical track is far too
              narrow to hold this text, so it renders below the group instead. */}
          {!isVertical && (
            <span className={cx('zoom-slider__value')} aria-hidden="true">
              {zoomValueLabel}
            </span>
          )}

          <Thumb
            state={state}
            trackRef={trackRef}
            index={0}
            orientation={orientation}
            travelInset={THUMB_TRAVEL_INSET[orientation]}
            energyIcon={disabled ? 'transparent' : `url(${getEnergyImageUrl(selectedClass)})`}
          />
        </div>
      </div>

      {/* Vertical only: below the track, since the narrow vertical track can't
          hold the text. Height isn't at a premium in the floaty container. */}
      {isVertical && (
        <span className={cx('zoom-slider__value')} aria-hidden="true">
          {zoomValueLabel}
        </span>
      )}
    </div>
  )
}

export default ZoomSlider
