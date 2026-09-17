import { useEffect, useRef, useState } from 'react'

/*
 * Reports whether the observed element is crossing a thin horizontal band at the lower-middle part
 * of the viewport, letting a component light itself up as it scrolls past — the scroll position
 * stands in for the pointer.
 *
 * Only active where hovering is genuinely unavailable, so a mouse keeps sole ownership of the
 * effect and the two triggers never fight over the same element.
 */

/*
 * The band, as percentages of viewport height: where its centre sits (measured from the top, so
 * above 50 is below the middle) and how tall it is. A caller whose elements are short passes a
 * smaller height, so only one of them is lit at a time.
 */
const BAND_CENTER = 60
const DEFAULT_BAND_HEIGHT = 50

const NO_HOVER_QUERY = '(hover: none)'

export function useFocusBand<T extends HTMLElement>(bandHeight = DEFAULT_BAND_HEIGHT) {
  const ref = useRef<T>(null)
  const [isInFocusBand, setIsInFocusBand] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const element = ref.current
    if (!element) return

    const hoverQuery = window.matchMedia(NO_HOVER_QUERY)
    let observer: IntersectionObserver | null = null

    const sync = () => {
      observer?.disconnect()
      observer = null

      if (!hoverQuery.matches) {
        setIsInFocusBand(false)
        return
      }

      // `rootMargin` insets each edge from itself, so the band is expressed as the space above
      // and below it.
      const insetTop = BAND_CENTER - bandHeight / 2
      const insetBottom = 100 - BAND_CENTER - bandHeight / 2

      observer = new IntersectionObserver(([entry]) => setIsInFocusBand(entry.isIntersecting), {
        rootMargin: `-${insetTop}% 0px -${insetBottom}% 0px`,
      })
      observer.observe(element)
    }

    sync()
    hoverQuery.addEventListener('change', sync)

    return () => {
      observer?.disconnect()
      hoverQuery.removeEventListener('change', sync)
    }
  }, [bandHeight])

  return { ref, isInFocusBand }
}
