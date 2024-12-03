import { useEffect, useRef } from 'react'

import { ChartControlState, ViewMode } from '../types/chart'
import { Difficulty, SpeedRunClass } from '../types/speedRun'

export function useUrlParams(selectedClass: SpeedRunClass, controls: ChartControlState) {
  // Use a ref to track if we've loaded initial URL params
  const initializedRef = useRef(false)

  // Update URL when controls change
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('class', selectedClass)
    params.set('difficulty', controls.difficulty)
    if (controls.playerLimit) params.set('players', controls.playerLimit.toString())
    params.set('duration', controls.maxDuration.toString())
    params.set('view', controls.viewMode)
    params.set('zoom', controls.zoomLevel.toString())

    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [
    selectedClass,
    controls.difficulty,
    controls.playerLimit,
    controls.maxDuration,
    controls.viewMode,
    controls.zoomLevel,
  ])

  // Load initial values from URL only once
  useEffect(() => {
    if (!initializedRef.current) {
      const params = new URLSearchParams(window.location.search)

      const difficulty = params.get('difficulty')
      if (difficulty && Object.values(Difficulty).includes(difficulty as Difficulty)) {
        controls.setDifficulty(difficulty as Difficulty)
      }

      const players = params.get('players')
      if (players) {
        const value = parseInt(players)
        if (!isNaN(value)) controls.setPlayerLimit(value)
      }

      const duration = params.get('duration')
      if (duration) {
        const value = parseInt(duration)
        if (!isNaN(value)) controls.setMaxDuration(value)
      }

      const view = params.get('view')
      if (view && Object.values(ViewMode).includes(view as ViewMode)) {
        controls.setViewMode(view as ViewMode)
      }

      const zoom = params.get('zoom')
      if (zoom) {
        const value = parseInt(zoom)
        if (!isNaN(value)) controls.setZoomLevel(value)
      }

      initializedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array since we only want this to run once

  return null
}
