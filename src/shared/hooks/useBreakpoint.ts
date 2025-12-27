import { useState, useEffect } from 'react'

// NB: Values should match breakpoints in _breakpoints.scss
const BREAKPOINT_MOBILE = 768
const BREAKPOINT_TABLET = 1024

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setIsMobile(window.innerWidth <= BREAKPOINT_MOBILE)
      setIsTabletOrSmaller(window.innerWidth <= BREAKPOINT_TABLET)
      setIsDesktop(window.innerWidth > BREAKPOINT_TABLET)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return { isMobile, isTabletOrSmaller, isDesktop }
}
