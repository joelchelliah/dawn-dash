import { useState } from 'react'

import { useDeviceOrientation } from '../../../../shared/hooks/useDeviceOrientation'

import styles from './index.module.scss'

function ChartRotateMessage() {
  const { isMobileAndPortrait } = useDeviceOrientation()
  const [showRotateMessage, setShowRotateMessage] = useState(true)

  if (!isMobileAndPortrait || !showRotateMessage) return null

  return (
    <div className={styles['container']}>
      <button
        className={styles['close-button']}
        onClick={() => setShowRotateMessage(false)}
        aria-label="Close message"
      >
        ×
      </button>
      <span className={styles['rotate-icon']}>📱</span>
      Rotate your device for a better view!
    </div>
  )
}

export default ChartRotateMessage
