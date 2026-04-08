import { useEffect, useRef, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ScrollableWithFadeProps {
  children: React.ReactNode
  maxHeight?: string
  className?: string
  fadeColor?: string
  // To prevent "jumping" when the content is scrolled to the bottom
  scrollBottomOffset?: number
}

function ScrollableWithFade({
  children,
  maxHeight = '85vh',
  className,
  fadeColor,
  scrollBottomOffset = 90,
}: ScrollableWithFadeProps): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  useEffect(() => {
    const contentEl = contentRef.current
    if (!contentEl) return

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentEl
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - scrollBottomOffset
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
  }, [scrollBottomOffset])

  const containerClassName = cx('container', className, {
    'show-fade': showBottomFade,
  })

  return (
    <div
      ref={contentRef}
      className={containerClassName}
      style={{
        maxHeight,
        ...(fadeColor && showBottomFade
          ? ({ '--fade-color': fadeColor } as React.CSSProperties)
          : {}),
      }}
    >
      {children}
    </div>
  )
}

export default ScrollableWithFade
