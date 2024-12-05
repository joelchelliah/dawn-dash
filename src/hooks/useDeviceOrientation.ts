import { useState, useEffect } from 'react'

export function useDeviceOrientation() {
  const checkIsMobile = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
  }

  const checkIsDiscord = () => {
    return navigator.userAgent.toLowerCase().includes('discord')
  }

  const checkIsLandscape = () => {
    if (screen.orientation?.type) return screen.orientation.type.includes('landscape')

    // Fallback to window dimensions
    return window.innerWidth > window.innerHeight
  }

  const isMobile = checkIsMobile()
  const isDiscord = checkIsDiscord()
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

  // NB: Discord browser is always locked to portrait
  // Overriding to enable landscape-related features when in Discord browser
  return {
    isMobile,
    isDiscord,
    isMobileAndLandscape: isMobile && isLandscape,
    isMobileAndPortrait: isMobile && !isLandscape,
  }
}
