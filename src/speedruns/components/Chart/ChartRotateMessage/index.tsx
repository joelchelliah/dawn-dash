import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useDeviceOrientation } from '@/shared/hooks/useDeviceOrientation'

import styles from './index.module.scss'

const cx = createCx(styles)

function ChartRotateMessage() {
  const { isMobileAndPortrait } = useDeviceOrientation()
  const [showRotateMessage, setShowRotateMessage] = useState(true)

  if (!isMobileAndPortrait || !showRotateMessage) return null

  return (
    <div className={cx('container')}>
      <button
        className={cx('close-button')}
        onClick={() => setShowRotateMessage(false)}
        aria-label="Close message"
      >
        ×
      </button>
      <span className={cx('rotate-icon')}>📱</span>
      Rotate your device for a better view!
    </div>
  )
}

export default ChartRotateMessage
