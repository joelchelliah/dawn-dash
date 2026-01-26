import { useEffect, useState, useRef, useCallback } from 'react'

import { useRouter } from 'next/router'

import { ALL_EVENTS_INDEX } from '../constants/eventSearchValues'
import { Event } from '../types/events'

interface UseEventUrlParam {
  isInvalidEvent: boolean
  eventNameInUrl: string | undefined
  selectEventAndUpdateUrl: (index: number) => void
}

export function useEventUrlParam(
  events: Event[],
  setSelectedEventIndex: (index: number) => void
): UseEventUrlParam {
  const router = useRouter()
  const eventParam = router.query.event as string | undefined
  const [isInvalidEvent, setIsInvalidEvent] = useState(false)

  // Track last processed param to prevent duplicate processing
  const lastProcessedParamRef = useRef<string | undefined>()

  // Update state from URL parameter (single source of truth)
  useEffect(() => {
    if (!router.isReady) return
    // Skip if we've already processed this parameter
    if (eventParam === lastProcessedParamRef.current) return

    if (eventParam) {
      const foundIndex = findEventIndexByName(events, eventParam)

      if (foundIndex === ALL_EVENTS_INDEX) {
        setSelectedEventIndex(ALL_EVENTS_INDEX)
        setIsInvalidEvent(true)
      } else {
        setSelectedEventIndex(foundIndex)
        setIsInvalidEvent(false)
      }

      lastProcessedParamRef.current = eventParam
    } else {
      setSelectedEventIndex(ALL_EVENTS_INDEX)
      setIsInvalidEvent(false)
      lastProcessedParamRef.current = undefined
    }
  }, [router.isReady, eventParam, events, setSelectedEventIndex])

  // Handle event change from UI - only update URL, let useEffect update state
  const selectEventAndUpdateUrl = useCallback(
    (index: number) => {
      if (index === ALL_EVENTS_INDEX) {
        // Only navigate if we're not already on the base route (prevents losing focus when filtering)
        if (router.asPath !== '/eventmaps') {
          router.push('/eventmaps', undefined, { shallow: true })
        }
      } else {
        const event = events[index]
        if (event) {
          const eventUrlParam = normalizeEventNameForUrl(event.name)
          router.push(`/eventmaps/${eventUrlParam}`, undefined, { shallow: true })
        }
      }
    },
    [events, router]
  )

  return {
    isInvalidEvent,
    eventNameInUrl: getEventNameInUrl(eventParam),
    selectEventAndUpdateUrl,
  }
}

export function normalizeEventNameForUrl(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_')
}

export function getEventNameInUrl(urlParam: string | undefined): string | undefined {
  return urlParam ? urlParam.replaceAll('_', ' ') : undefined
}

export function findEventByName(events: Event[], urlParam: string): Event | null {
  const normalizedParam = urlParam.toLowerCase()

  const event = events.find((event) => {
    const normalizedName = normalizeEventNameForUrl(event.name)
    return normalizedName === normalizedParam
  })

  return event || null
}

function findEventIndexByName(events: Event[], urlParam: string): number {
  const normalizedParam = urlParam.toLowerCase()

  const index = events.findIndex((event) => {
    const normalizedName = normalizeEventNameForUrl(event.name)
    return normalizedName === normalizedParam
  })

  return index >= 0 ? index : ALL_EVENTS_INDEX
}
