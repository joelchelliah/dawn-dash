import { useState, useEffect } from 'react'

// NB: Values should match breakpoints in _constants.scss
const BREAKPOINT_TABLET = 1024

export function useBreakpoint() {
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setIsTabletOrSmaller(window.innerWidth <= BREAKPOINT_TABLET)
      setIsDesktop(window.innerWidth > BREAKPOINT_TABLET)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return { isTabletOrSmaller, isDesktop }
}
