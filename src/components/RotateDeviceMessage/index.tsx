import { useState } from 'react'

import { useDeviceOrientation } from '../../hooks/useDeviceOrientation'

import './index.scss'

function RotateDeviceMessage() {
  const { isMobileAndPortrait } = useDeviceOrientation()
  const [showRotateMessage, setShowRotateMessage] = useState(true)

  if (!isMobileAndPortrait || !showRotateMessage) return null

  return (
    <div className="rotate-device-message">
      <button
        className="close-button"
        onClick={() => setShowRotateMessage(false)}
        aria-label="Close message"
      >
        ×
      </button>
      <span className="rotate-icon">📱</span>
      Rotate your device for a better view!
    </div>
  )
}

export default RotateDeviceMessage
