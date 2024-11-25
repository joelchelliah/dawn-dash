import { useState, useEffect } from 'react'

export function useDeviceOrientation() {
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      setIsMobile(/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent))
    }

    const handleOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }

    checkMobile()
    window.addEventListener('resize', handleOrientation)
    window.addEventListener('orientationchange', handleOrientation)

    return () => {
      window.removeEventListener('resize', handleOrientation)
      window.removeEventListener('orientationchange', handleOrientation)
    }
  }, [])

  return { isLandscape, isMobile }
}
