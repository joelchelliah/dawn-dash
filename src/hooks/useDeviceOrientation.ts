import { useState, useEffect } from 'react'

export function useDeviceOrientation() {
  const checkIsMobile = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
  }

  const checkIsLandscape = () => {
    if (screen.orientation?.type) return screen.orientation.type.includes('landscape')

    // Fallback to window dimensions
    return window.innerWidth > window.innerHeight
  }

  const isMobile = checkIsMobile()
  const [isLandscape, setIsLandscape] = useState(checkIsLandscape())

  useEffect(() => {
    const handleOrientation = () => setIsLandscape(checkIsLandscape())

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
