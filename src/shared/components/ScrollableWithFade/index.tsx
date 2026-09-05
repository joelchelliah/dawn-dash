import { useEffect, useRef, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

// Matches the CSS fallback for --fade-height in index.module.scss.
const DEFAULT_FADE_HEIGHT = '12rem'

/**
 * Resolves a CSS length (rem, px, em...) to pixels by letting the browser compute it.
 * The fade height is authored in CSS units but the scroll maths needs real pixels.
 */
const toPixels = (length: string): number => {
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;height:${length}`
  document.body.appendChild(probe)
  const pixels = probe.getBoundingClientRect().height
  probe.remove()

  return pixels
}

interface ScrollableWithFadeProps {
  children: React.ReactNode
  maxHeight?: string
  className?: string
  fadeColor?: string
  // How far from the bottom the fade switches off, in px
  scrollBottomOffset?: number
  // Height of the bottom fade gradient
  fadeHeight?: string
}

function ScrollableWithFade({
  children,
  maxHeight = '85vh',
  className,
  fadeColor,
  scrollBottomOffset,
  fadeHeight,
}: ScrollableWithFadeProps): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  useEffect(() => {
    const contentEl = contentRef.current
    if (!contentEl) return

    // The fade should clear exactly as its gradient reaches the end of the content.
    const offset = scrollBottomOffset ?? toPixels(fadeHeight ?? DEFAULT_FADE_HEIGHT)

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentEl
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - offset
      setShowBottomFade(!isScrolledToBottom && scrollHeight > clientHeight)
    }

    // Check initially and on scroll
    checkScroll()
    contentEl.addEventListener('scroll', checkScroll)

    // Also check on resize
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(contentEl)

    return () => {
      contentEl.removeEventListener('scroll', checkScroll)
      resizeObserver.disconnect()
    }
  }, [scrollBottomOffset, fadeHeight])

  const containerClassName = cx('container', className, {
    'show-fade': showBottomFade,
  })

  return (
    <div
      ref={contentRef}
      className={containerClassName}
      style={
        {
          maxHeight,
          ...(fadeHeight ? { '--fade-height': fadeHeight } : {}),
          ...(fadeColor && showBottomFade ? { '--fade-color': fadeColor } : {}),
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}

export default ScrollableWithFade
