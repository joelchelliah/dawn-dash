import { useEffect, useRef } from 'react'

import { useSearchParams } from 'react-router-dom'

import { ChartControlState, ViewMode } from '../types/chart'
import { Difficulty, SpeedRunClass } from '../types/speedRun'

export function useUrlParams(selectedClass: SpeedRunClass, controls: ChartControlState): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const initializedRef = useRef(false)

  // Update URL when controls change
  useEffect(() => {
    // Skip the first render to avoid overwriting URL params
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }

    const params = new URLSearchParams()

    params.set('class', selectedClass)
    params.set('difficulty', controls.difficulty)
    params.set('players', controls.playerLimit.toString())
    params.set('duration', controls.maxDuration.toString())
    params.set('view', controls.viewMode)
    params.set('zoom', controls.zoomLevel.toString())

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params)
    }
  }, [selectedClass, controls, setSearchParams, searchParams])

  // Read initial values from URL
  useEffect(() => {
    if (initializedRef.current) return // Skip if already initialized

    const difficulty = searchParams.get('difficulty')
    const players = searchParams.get('players')
    const duration = searchParams.get('duration')
    const view = searchParams.get('view')
    const zoom = searchParams.get('zoom')

    if (difficulty) controls.setDifficulty(difficulty as Difficulty)
    if (players) controls.setPlayerLimit(parseInt(players))
    if (duration) controls.setMaxDuration(parseInt(duration))
    if (view) controls.setViewMode(view as ViewMode)
    if (zoom) controls.setZoomLevel(parseInt(zoom))

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array for initial load only
}
