import { useEffect, useState, useCallback, useRef } from 'react'

const SCROLL_DURATION = 250

export const useScrollToTop = (yOffset = 0) => {
  const [showButton, setShowButton] = useState(false)
  const scrollingRef = useRef(false)

  const updateShowButtonBasedOnScrollPosition = useCallback(() => {
    if (scrollingRef.current || typeof window === 'undefined') return

    const thresholdPixels = yOffset + (window.innerWidth <= 768 ? 1200 : 750)
    const scrollY = window.scrollY

    setShowButton(scrollY > thresholdPixels)
  }, [yOffset])

  const scrollToTop = useCallback(() => {
    if (scrollingRef.current || typeof window === 'undefined') return

    scrollingRef.current = true

    const startY = window.scrollY
    const startTime = performance.now()

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / SCROLL_DURATION, 1)

      const easeOutCubic = 1 - Math.pow(1 - progress, 3)

      const currentY = startY * (1 - easeOutCubic)
      window.scrollTo(0, currentY)

      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      } else {
        scrollingRef.current = false

        updateShowButtonBasedOnScrollPosition()
      }
    }

    requestAnimationFrame(animateScroll)
  }, [updateShowButtonBasedOnScrollPosition])

  useEffect(() => {
    if (typeof window === 'undefined') return

    updateShowButtonBasedOnScrollPosition()
    window.addEventListener('scroll', updateShowButtonBasedOnScrollPosition, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateShowButtonBasedOnScrollPosition)
    }
  }, [updateShowButtonBasedOnScrollPosition])

  return {
    showButton,
    scrollToTop,
  }
}
