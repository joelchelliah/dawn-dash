import { useCallback, useRef, useState } from 'react'

interface UseDraggableReturn {
  isDragging: boolean
  handlers: {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => void
    onMouseMove: (e: React.MouseEvent<HTMLElement>) => void
    onMouseUp: () => void
    onMouseLeave: () => void
  }
}

/**
 * Custom hook for adding click-and-drag scrolling functionality to a scrollable container.
 *
 * This hook provides mouse event handlers that allow users to pan/scroll through content
 * by clicking and dragging, similar to grabbing and moving a canvas. It automatically
 * enforces scroll boundaries to prevent over-scrolling.
 *
 * @example
 * ```tsx
 * const scrollWrapperRef = useRef<HTMLDivElement>(null)
 * const { isDragging, handlers } = useDraggable(scrollWrapperRef)
 *
 * return (
 *   <div
 *     ref={scrollWrapperRef}
 *     className={isDragging ? 'dragging' : 'grabbable'}
 *     {...handlers}
 *   >
 *     <svg>...</svg>
 *   </div>
 * )
 * ```
 */
export function useDraggable(containerRef: React.RefObject<HTMLElement>): UseDraggableReturn {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{
    x: number
    y: number
    scrollLeft: number
    scrollTop: number
  }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!containerRef.current) return
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      }
    },
    [containerRef]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!isDragging || !containerRef.current) return

      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y

      // Calculate new scroll positions (opposite direction of mouse movement)
      const newScrollLeft = dragStartRef.current.scrollLeft - dx
      const newScrollTop = dragStartRef.current.scrollTop - dy

      // Apply boundaries: clamp between 0 and max scroll
      const maxScrollLeft = containerRef.current.scrollWidth - containerRef.current.clientWidth
      const maxScrollTop = containerRef.current.scrollHeight - containerRef.current.clientHeight

      containerRef.current.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft))
      containerRef.current.scrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop))
    },
    [isDragging, containerRef]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  return {
    isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
  }
}
