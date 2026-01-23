import { createCx } from '@/shared/utils/classnames'
import Select from '@/shared/components/Select'
import { CharacterClass } from '@/shared/types/characterClass'

import { ZoomLevel, ZOOM_LEVELS, ZOOM_LABEL_MAP } from '@/codex/constants/eventSearchValues'

import styles from './index.module.scss'

const cx = createCx(styles)

interface StickyZoomSelectProps {
  selectedClass: CharacterClass
  zoomLevel: ZoomLevel
  setZoomLevel: (zoom: ZoomLevel) => void
  disabled: boolean
}

const StickyZoomSelect = ({
  selectedClass,
  zoomLevel,
  setZoomLevel,
  disabled,
}: StickyZoomSelectProps) => {
  const zoomOptions = ZOOM_LEVELS.map((zoom) => ({
    value: zoom,
    label: ZOOM_LABEL_MAP[zoom],
  }))

  return (
    <div className={cx('sticky-zoom')}>
      <Select
        id="sticky-zoom-select"
        selectedClass={selectedClass}
        label="Zoom"
        options={zoomOptions}
        value={zoomLevel}
        onChange={setZoomLevel}
        disabled={disabled}
      />
    </div>
  )
}

export default StickyZoomSelect
