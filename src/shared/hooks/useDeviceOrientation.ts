import { useState, useEffect } from 'react'

export function useDeviceOrientation() {
  const checkIsMobile = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
  }

  const checkIsLandscape = () => {
    if (typeof window !== 'undefined' && screen.orientation?.type) {
      return screen.orientation.type.includes('landscape')
    }
    // Fallback to window dimensions
    return typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  }

  const isMobile = checkIsMobile()
  const [isLandscape, setIsLandscape] = useState(checkIsLandscape())

  useEffect(() => {
    const handleOrientation = () => setIsLandscape(checkIsLandscape())

    if (typeof window !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientation)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleOrientation)
      window.addEventListener('orientationchange', handleOrientation)
    }

    // Force an immediate check
    handleOrientation()

    return () => {
      if (typeof window !== 'undefined' && screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientation)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleOrientation)
        window.removeEventListener('orientationchange', handleOrientation)
      }
    }
  }, [])

  return {
    isMobile,
    isMobileAndLandscape: isMobile && isLandscape,
    isMobileAndPortrait: isMobile && !isLandscape,
  }
}
