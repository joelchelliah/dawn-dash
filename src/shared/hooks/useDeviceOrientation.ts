import { useState, useEffect } from 'react'

const checkIsMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
}

const checkIsLandscape = () => {
  if (screen.orientation?.type) {
    return screen.orientation.type.includes('landscape')
  }
  // Fallback to window dimensions
  return window.innerWidth > window.innerHeight
}

export function useDeviceOrientation() {
  // Both start false and are set on mount, so server and client render the same initial output
  const [isMobile, setIsMobile] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const handleOrientation = () => setIsLandscape(checkIsLandscape())

    setIsMobile(checkIsMobile())
    handleOrientation()

    screen.orientation?.addEventListener('change', handleOrientation)
    window.addEventListener('resize', handleOrientation)
    window.addEventListener('orientationchange', handleOrientation)

    return () => {
      screen.orientation?.removeEventListener('change', handleOrientation)
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
