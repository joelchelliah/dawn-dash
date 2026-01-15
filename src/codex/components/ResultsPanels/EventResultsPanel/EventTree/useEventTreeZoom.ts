import { useRef } from 'react'

import { ZoomLevel, MAX_ZOOM_LEVEL } from '@/codex/constants/eventSearchValues'

interface CoverScaleCache {
  eventId: string
  coverScale: number
}

interface ZoomCalculatorParams {
  eventName: string
  zoomLevel: ZoomLevel
  svgWidth: number
  svgHeight: number
  containerWidth: number
  containerHeight: number
}

/**
 * Zoom calculator that maintains cover scale cache across renders
 *
 * For small trees (coverScale >= 1):
 * - Zoom levels scale from actual size (100 = 1.0x, 150 = 1.5x, 200 = 2.0x)
 *
 * For large trees (coverScale < 1):
 * - Zoom levels interpolate from cover scale to actual size (200 = 1.0x actual size)
 *
 * When switching to a new event, Cover mode is always forced,
 * to capture clean container dimensions. This is to prevent inconsistent scaling between events.
 */
class ZoomCalculator {
  private cache: CoverScaleCache | null = null

  calculate(params: ZoomCalculatorParams): number | undefined {
    const { eventName, zoomLevel, svgWidth, svgHeight, containerWidth, containerHeight } = params

    // Use viewBox scaling if container dimensions aren't available
    if (containerWidth === 0 || containerHeight === 0) return undefined

    // When in Cover mode, calculate and cache coverScale
    if (zoomLevel === ZoomLevel.COVER) {
      this.cache = {
        eventId: eventName,
        coverScale: Math.min(containerWidth / svgWidth, containerHeight / svgHeight),
      }
      return undefined
    }

    // For numbered zoom levels, use cached coverScale (fallback to viewBox if no cache)
    if (!this.cache || this.cache.eventId !== eventName) return undefined

    const { coverScale } = this.cache

    // Small trees: direct scaling (100 = 1.0x, 150 = 1.5x, 200 = 2.0x)
    if (coverScale >= 1.0) return zoomLevel / 100

    // Large trees: interpolate from cover scale to actual size
    const interpolationFactor = zoomLevel / MAX_ZOOM_LEVEL
    return coverScale + (1.0 - coverScale) * interpolationFactor
  }
}

/**
 * Custom hook that provides a zoom calculator instance that persists across renders
 */
export function useEventTreeZoom() {
  const calculatorRef = useRef<ZoomCalculator>()

  if (!calculatorRef.current) {
    calculatorRef.current = new ZoomCalculator()
  }

  return calculatorRef.current
}
