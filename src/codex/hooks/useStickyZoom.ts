import { useEffect, useState, useCallback } from 'react'

import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

export const useStickyZoom = (threshold: number, mobileThreshold: number) => {
  const { isMobile } = useBreakpoint()
  const [showStickyZoom, setShowStickyZoom] = useState(false)

  const updateShowStickyZoom = useCallback(() => {
    if (typeof window === 'undefined') return

    const scrollY = window.scrollY
    setShowStickyZoom(scrollY > (isMobile ? mobileThreshold : threshold))
  }, [isMobile, threshold, mobileThreshold])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isMobile && threshold === 0) {
      setShowStickyZoom(true)
      return
    }

    updateShowStickyZoom()
    window.addEventListener('scroll', updateShowStickyZoom, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateShowStickyZoom)
    }
  }, [updateShowStickyZoom, isMobile, threshold])

  return showStickyZoom
}
