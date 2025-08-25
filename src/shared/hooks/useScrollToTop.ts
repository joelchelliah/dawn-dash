import { useEffect, useState, useCallback, useRef } from 'react'

interface UseScrollToTopOptions {
  thresholdPixels?: number
  scrollDuration?: number
}

export const useScrollToTop = ({
  thresholdPixels = 400,
  scrollDuration = 250,
}: UseScrollToTopOptions = {}) => {
  const [showButton, setShowButton] = useState(false)
  const scrollingRef = useRef(false)

  const checkScrollPosition = useCallback(() => {
    if (scrollingRef.current) return

    const scrollY = window.scrollY

    setShowButton(scrollY > thresholdPixels)
  }, [thresholdPixels])

  const scrollToTop = useCallback(() => {
    if (scrollingRef.current) return

    scrollingRef.current = true

    const startY = window.scrollY
    const startTime = performance.now()

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / scrollDuration, 1)

      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)

      const currentY = startY * (1 - easeOutCubic)
      window.scrollTo(0, currentY)

      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      } else {
        scrollingRef.current = false
      }
    }

    requestAnimationFrame(animateScroll)
  }, [scrollDuration])

  useEffect(() => {
    checkScrollPosition()
    window.addEventListener('scroll', checkScrollPosition, { passive: true })
    window.addEventListener('resize', checkScrollPosition, { passive: true })

    return () => {
      window.removeEventListener('scroll', checkScrollPosition)
      window.removeEventListener('resize', checkScrollPosition)
    }
  }, [checkScrollPosition])

  return {
    showButton,
    scrollToTop,
  }
}
