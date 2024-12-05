import { useState, useEffect } from 'react'

export function useDeviceOrientation() {
  const checkOrientation = () => {
    // Discord's in-app browser doesn't support the Screen Orientation API
    const isDiscordBrowser = navigator.userAgent.includes('Discord')

    console.log('isDiscordBrowser', isDiscordBrowser)

    if (screen.orientation?.type && !isDiscordBrowser) {
      console.log('screen.orientation.type', screen.orientation.type)
      return screen.orientation.type.includes('landscape')
    }

    console.log('window.innerWidth > window.innerHeight', window.innerWidth > window.innerHeight)
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

  useEffect(() => {
    console.log('ON LOAD')
    console.log('User Agent:', navigator.userAgent)
    console.log(
      'Screen Orientation:',
      screen.orientation ? screen.orientation.type : 'Not available'
    )
    console.log('Window dimensions:', window.innerWidth, window.innerHeight)
    console.log('--------------------------------')
  }, [])

  return {
    isMobile,
    isMobileAndLandscape: isMobile && isLandscape,
    isMobileAndPortrait: isMobile && !isLandscape,
  }
}
