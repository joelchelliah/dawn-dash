import { useEffect, useRef, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ModalProps {
  children: React.ReactNode
  borderColor?: string
  isOpen: boolean
  onClose: () => void
  maxWidth?: number
  scrollable?: boolean
}

// To prevent "jumping" when the modal is scrolled to the bottom
const SCROLL_IS_AT_BOTTOM_OFFSET = 90

function Modal({
  children,
  borderColor,
  isOpen,
  onClose,
  maxWidth,
  scrollable,
}: ModalProps): JSX.Element | null {
  const contentRef = useRef<HTMLDivElement>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  useEffect(() => {
    if (!scrollable || !isOpen) return

    const contentEl = contentRef.current
    if (!contentEl) return

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentEl
      const isScrolledToBottom =
        scrollTop + clientHeight >= scrollHeight - SCROLL_IS_AT_BOTTOM_OFFSET
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
  }, [scrollable, isOpen])

  if (!isOpen) return null

  const wrapperClassName = cx('wrapper', {
    'wrapper--without-class-border': !borderColor,
  })

  const contentClassName = cx('content', {
    'content--scrollable': scrollable,
    'content--show-fade': showBottomFade,
  })

  return (
    <div className={cx('overlay')} onClick={onClose}>
      <div
        className={wrapperClassName}
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor, maxWidth }}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
