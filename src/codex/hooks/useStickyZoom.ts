import { useEffect, useState, useCallback } from 'react'

// This value needs to be adjusted if we change the layout of search panel
const STICKY_ZOOM_THRESHOLD = 350

export const useStickyZoom = () => {
  const [showStickyZoom, setShowStickyZoom] = useState(false)

  const updateShowStickyZoom = useCallback(() => {
    if (typeof window === 'undefined') return

    const scrollY = window.scrollY
    setShowStickyZoom(scrollY > STICKY_ZOOM_THRESHOLD)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    updateShowStickyZoom()
    window.addEventListener('scroll', updateShowStickyZoom, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateShowStickyZoom)
    }
  }, [updateShowStickyZoom])

  return showStickyZoom
}
