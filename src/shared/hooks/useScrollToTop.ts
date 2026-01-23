import { useEffect, useState, useCallback, useRef } from 'react'

const SCROLL_DURATION = 300

export const useScrollToTop = (thresholdPixels: number) => {
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false)
  const scrollingRef = useRef(false)

  const updateShowButtonBasedOnScrollPosition = useCallback(() => {
    if (scrollingRef.current || typeof window === 'undefined') return

    const scrollY = window.scrollY

    setShowScrollToTopButton(scrollY > thresholdPixels)
  }, [thresholdPixels])

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
    showScrollToTopButton,
    scrollToTop,
  }
}
