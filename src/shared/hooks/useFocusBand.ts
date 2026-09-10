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
 * above 50 is below the middle) and how tall it is.
 */
const BAND_CENTER = 60
const BAND_HEIGHT = 30

// `rootMargin` insets each edge from itself, so the band is expressed as the space above and below it.
const BAND_INSET_TOP = BAND_CENTER - BAND_HEIGHT / 2
const BAND_INSET_BOTTOM = 100 - BAND_CENTER - BAND_HEIGHT / 2

const NO_HOVER_QUERY = '(hover: none)'

export function useFocusBand<T extends HTMLElement>() {
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

      observer = new IntersectionObserver(([entry]) => setIsInFocusBand(entry.isIntersecting), {
        rootMargin: `-${BAND_INSET_TOP}% 0px -${BAND_INSET_BOTTOM}% 0px`,
      })
      observer.observe(element)
    }

    sync()
    hoverQuery.addEventListener('change', sync)

    return () => {
      observer?.disconnect()
      hoverQuery.removeEventListener('change', sync)
    }
  }, [])

  return { ref, isInFocusBand }
}
