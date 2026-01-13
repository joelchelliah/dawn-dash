import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Select from '@/shared/components/Select'
import { CharacterClass } from '@/shared/types/characterClass'
import Button from '@/shared/components/Buttons/Button'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import GradientLink from '@/shared/components/GradientLink'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'

import eventTreesData from '@/codex/data/event-trees.json'
import { Event } from '@/codex/types/events'
import {
  ZOOM_LEVELS,
  ZoomLevel,
  LoopingPathMode,
  LOOPING_PATH_MODES,
} from '@/codex/constants/eventSearchValues'

import PanelHeader from '../../PanelHeader'
import SearchField from '../shared/SearchField'

import styles from './index.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]
interface EventSearchPanelProps {
  selectedEventIndex: number
  onEventChange: (index: number) => void
  zoomLevel: ZoomLevel
  onZoomChange: (zoom: ZoomLevel) => void
  loopingPathMode: LoopingPathMode
  onLoopingPathModeChange: (mode: LoopingPathMode) => void
}

const getZoomLabel = (zoom: ZoomLevel): string => {
  if (zoom === 'auto') return 'Auto'
  if (zoom === 'cover') return 'Cover'
  return `${zoom}%`
}

const getLoopingPathModeLabel = (mode: LoopingPathMode): string => {
  if (mode === LoopingPathMode.INDICATOR) return 'With «Repeatable» badges on nodes'
  return 'With lines back to the repeating nodes'
}

const EventSearchPanel = ({
  selectedEventIndex,
  onEventChange,
  zoomLevel,
  onZoomChange,
  loopingPathMode,
  onLoopingPathModeChange,
}: EventSearchPanelProps) => {
  const selectedClass = CharacterClass.Sunforge
  const { isMobile } = useBreakpoint()
  const eventOptions = eventTrees.map((event, index) => ({
    value: index,
    label: event.name,
  }))

  const zoomOptions = ZOOM_LEVELS.map((zoom) => ({
    value: zoom,
    label: getZoomLabel(zoom),
  }))

  const loopingPathModeOptions = LOOPING_PATH_MODES.map((mode) => ({
    value: mode,
    label: getLoopingPathModeLabel(mode),
  }))

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const advancedOptionsArrow = showAdvancedOptions ? '▴' : '▾'
  const [filterText, setFilterText] = useState('')

  const handleResetClick = () => {
    onEventChange(0)
    onZoomChange('auto')
    setFilterText('')
    onLoopingPathModeChange(LoopingPathMode.INDICATOR)
  }

  return (
    <div className={cx('search-panel')}>
      <PanelHeader type="Search" />

      <div className={cx('controls')}>
        <div className={cx('control-wrapper', 'control-wrapper--event')}>
          <Select
            id="event-select"
            selectedClass={selectedClass}
            label="Select Event"
            options={eventOptions}
            value={selectedEventIndex}
            onChange={onEventChange}
          />
        </div>

        <div className={cx('control-wrapper', 'control-wrapper--zoom')}>
          <Select
            id="zoom-select"
            selectedClass={selectedClass}
            label="Zoom"
            options={zoomOptions}
            value={zoomLevel}
            onChange={onZoomChange}
          />
        </div>
        <div className={cx('control-wrapper', 'control-wrapper--button-wrapper')}>
          <Button
            className={cx('control-wrapper--reset-search-button')}
            style={{
              color: getClassColor(selectedClass, ClassColorVariant.Light),
              borderColor: getClassColor(selectedClass, ClassColorVariant.Dark),
            }}
            onClick={handleResetClick}
          >
            Reset search
          </Button>
        </div>
        {!isMobile && (
          <div className={cx('control-wrapper', 'control-wrapper--button-wrapper')}>
            <GradientButton
              className={cx('control-wrapper--advanced-options-button')}
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              Advanced options {advancedOptionsArrow}
            </GradientButton>
          </div>
        )}
      </div>
      <div className={cx('advanced-options')}>
        {isMobile && (
          <>
            <GradientLink
              text="Advanced options"
              className={cx('advanced-options__link')}
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            />{' '}
            <span className={cx('advanced-options__arrow')}>{advancedOptionsArrow}</span>
          </>
        )}
        {showAdvancedOptions && (
          <div className={cx('advanced-options__content')}>
            <div className={cx('control-wrapper', 'control-wrapper--search-field')}>
              <SearchField
                keywords={filterText}
                setKeywords={setFilterText}
                mode="text"
                selectedClass={selectedClass}
              />
            </div>
            <div className={cx('control-wrapper', 'control-wrapper--looping-path')}>
              <Select
                id="looping-path-mode-select"
                selectedClass={selectedClass}
                label="🔄 &nbsp;Show looping paths"
                options={loopingPathModeOptions}
                value={loopingPathMode}
                onChange={onLoopingPathModeChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EventSearchPanel
