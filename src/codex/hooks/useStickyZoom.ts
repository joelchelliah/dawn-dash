import { useEffect, useState, useCallback } from 'react'

import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

// This value needs to be adjusted if we change the layout of search panel
const STICKY_ZOOM_THRESHOLD = 250
const STICKY_ZOOM_THRESHOLD_MOBILE = 300

export const useStickyZoom = () => {
  const { isMobile } = useBreakpoint()
  const [showStickyZoom, setShowStickyZoom] = useState(false)

  const updateShowStickyZoom = useCallback(() => {
    if (typeof window === 'undefined') return

    const scrollY = window.scrollY
    setShowStickyZoom(scrollY > (isMobile ? STICKY_ZOOM_THRESHOLD_MOBILE : STICKY_ZOOM_THRESHOLD))
  }, [isMobile])

  useEffect(() => {
    if (typeof window === 'undefined') return

    updateShowStickyZoom()
    window.addEventListener('scroll', updateShowStickyZoom, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateShowStickyZoom)
    }
  }, [updateShowStickyZoom, isMobile])

  return showStickyZoom
}
