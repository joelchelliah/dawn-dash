import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'

import { ZoomLevel } from '@/codex/constants/zoomValues'
import ZoomSlider from '@/codex/components/shared/ZoomSlider'

import styles from './index.module.scss'

const cx = createCx(styles)

interface StickyZoomSliderProps {
  selectedClass?: CharacterClass
  zoomLevel: ZoomLevel
  setZoomLevel: (zoom: ZoomLevel) => void
  position?: 'right' | 'left'
  disabled?: boolean
  className?: string
}

const StickyZoomSlider = ({
  selectedClass = CharacterClass.Neutral,
  zoomLevel,
  setZoomLevel,
  position = 'right',
  disabled = false,
  className,
}: StickyZoomSliderProps) => (
  <div className={cx('sticky-zoom', className, { 'sticky-zoom--left': position === 'left' })}>
    <ZoomSlider
      selectedClass={selectedClass}
      zoomLevel={zoomLevel}
      setZoomLevel={setZoomLevel}
      orientation="vertical"
      disabled={disabled}
    />
  </div>
)

export default StickyZoomSlider
