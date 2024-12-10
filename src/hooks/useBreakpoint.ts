import { useState, useEffect } from 'react'

// NB: Values should match breakpoints in _constants.scss
const BREAKPOINT_TABLET = 1023

export function useBreakpoint() {
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(window.innerWidth <= BREAKPOINT_TABLET)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > BREAKPOINT_TABLET)

  useEffect(() => {
    const handleResize = () => {
      setIsTabletOrSmaller(window.innerWidth <= BREAKPOINT_TABLET)
      setIsDesktop(window.innerWidth > BREAKPOINT_TABLET)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return { isTabletOrSmaller, isDesktop }
}
