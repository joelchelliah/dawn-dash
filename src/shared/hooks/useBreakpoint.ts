import { useState, useEffect } from 'react'

// NB: Values should match breakpoints in _breakpoints.scss
// Using matchMedia ensures JS breakpoints match CSS media queries exactly
const MEDIA_QUERY_MOBILE = '(max-width: 48rem)' // 768px
const MEDIA_QUERY_TABLET = '(max-width: 64rem)' // 1024px

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mobileQuery = window.matchMedia(MEDIA_QUERY_MOBILE)
    const tabletQuery = window.matchMedia(MEDIA_QUERY_TABLET)

    const handleResize = () => {
      setIsMobile(mobileQuery.matches)
      setIsTabletOrSmaller(tabletQuery.matches)
      setIsDesktop(!tabletQuery.matches)
    }

    // Initial check
    handleResize()

    // Listen for changes
    mobileQuery.addEventListener('change', handleResize)
    tabletQuery.addEventListener('change', handleResize)

    return () => {
      mobileQuery.removeEventListener('change', handleResize)
      tabletQuery.removeEventListener('change', handleResize)
    }
  }, [])

  return { isMobile, isTabletOrSmaller, isDesktop }
}
