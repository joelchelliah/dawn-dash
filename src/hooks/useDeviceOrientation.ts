import { useState, useEffect } from 'react'

export function useDeviceOrientation() {
  const checkOrientation = () => {
    // Try Screen Orientation API first
    // This is needed when opening the app from Discord's in-app browser
    if (screen.orientation) {
      return screen.orientation.type.includes('landscape')
    }
    // Fallback to window dimensions
    return window.innerWidth > window.innerHeight
  }

  const checkMobile = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
  }

  const [isLandscape, setIsLandscape] = useState(checkOrientation())
  const isMobile = checkMobile()

  useEffect(() => {
    const handleOrientation = () => setIsLandscape(checkOrientation())

    // Listen to both screen orientation and resize events
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientation)
    }
    window.addEventListener('resize', handleOrientation)
    window.addEventListener('orientationchange', handleOrientation)

    // Force an immediate check
    handleOrientation()

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientation)
      }
      window.removeEventListener('resize', handleOrientation)
      window.removeEventListener('orientationchange', handleOrientation)
    }
  }, [])

  return {
    isMobile,
    isMobileAndLandscape: isMobile && isLandscape,
    isMobileAndPortrait: isMobile && !isLandscape,
  }
}
